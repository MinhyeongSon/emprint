import type { GitHubAuthStatus, GitHubDeviceCode, GitHubOAuthClientConfig } from '@emprint/shared'
import { workspaceRuntime } from '@emprint/core'
import { safeReadText } from '../../http-utils.js'
import type { AuthProvider } from '../../types.js'
import { syncSiteCopyrightHolder } from '../../../workspace/site-config-sync.js'
import {
  ensureGithubOAuthCredentials,
  oauthClientHasSecret,
  readGithubOAuthClient,
  refreshCachedGithubClientId,
  resolveGithubOAuthCredentials,
  writeGithubOAuthClient
} from './credentials.js'
import { performGithubLogout } from './revoke.js'
import { readGithubSession, writeGithubSession } from './session.js'

const DEVICE_CODE_GRANT_TYPE = 'urn:ietf:params:oauth:grant-type:device_code'

function formatGithubAuthPollError(error: string, description?: string): string {
  const detail = description ? ` (${description})` : ''
  if (error === 'incorrect_client_credentials') {
    return (
      `GitHub auth error: incorrect_client_credentials${detail}. ` +
      'Confirm you created an OAuth App (not a GitHub App), enabled Device Flow, and that the saved Client ID and Client Secret belong to the same app.'
    )
  }
  return `GitHub auth error: ${error}${detail}`
}

async function githubApiGet(url: string, token: string): Promise<{ login?: string }> {
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'Emprint'
    }
  })
  if (!res.ok) {
    throw new Error(`GitHub API failed (${res.status}).`)
  }
  return (await res.json()) as { login?: string }
}

export { performGithubLogout } from './revoke.js'
export { readGithubSession } from './session.js'

export const githubAuthProvider: AuthProvider = {
  id: 'github',
  displayName: 'GitHub',

  async oauthClientGet(): Promise<GitHubOAuthClientConfig> {
    const stored = await readGithubOAuthClient()
    const env = process.env.EMPRINT_GITHUB_CLIENT_ID || process.env.GITHUB_CLIENT_ID
    const clientId = stored?.clientId || env || undefined
    const hasClientSecret = oauthClientHasSecret(stored)
    return clientId ? { clientId, hasClientSecret } : { hasClientSecret }
  },

  async oauthClientSet(input: {
    clientId: string
    clientSecret?: string
  }): Promise<GitHubOAuthClientConfig> {
    const clientId = input.clientId.trim()
    if (!clientId) {
      throw new Error('Client ID is required.')
    }
    const existing = await readGithubOAuthClient()
    const clientIdChanged = Boolean(existing?.clientId && existing.clientId !== clientId)
    const clientSecret =
      input.clientSecret !== undefined
        ? input.clientSecret.trim() || undefined
        : clientIdChanged
          ? undefined
          : existing?.clientSecret
    await writeGithubOAuthClient({ clientId, ...(clientSecret ? { clientSecret } : {}) })
    await refreshCachedGithubClientId()
    return {
      clientId,
      hasClientSecret: oauthClientHasSecret(await readGithubOAuthClient())
    }
  },

  async authStatus(): Promise<GitHubAuthStatus> {
    const session = await readGithubSession()
    return session ? { connected: true, login: session.login } : { connected: false }
  },

  async authStart(input: { scopes: string[] }): Promise<GitHubDeviceCode> {
    const { clientId } = await ensureGithubOAuthCredentials()
    const scopes = Array.isArray(input.scopes) ? input.scopes : []

    const body = new URLSearchParams()
    body.set('client_id', clientId)
    if (scopes.length > 0) {
      body.set('scope', scopes.join(' '))
    }

    const res = await fetch('https://github.com/login/device/code', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body
    })

    if (!res.ok) {
      const message = await safeReadText(res)
      throw new Error(`GitHub device code request failed (${res.status}): ${message}`)
    }

    const json = (await res.json()) as {
      device_code?: string
      user_code?: string
      verification_uri?: string
      expires_in?: number
      interval?: number
    }

    if (!json.device_code || !json.user_code || !json.verification_uri) {
      throw new Error('Invalid GitHub device code response.')
    }

    return {
      deviceCode: json.device_code,
      userCode: json.user_code,
      verificationUri: json.verification_uri,
      expiresIn: Number(json.expires_in ?? 900),
      interval: Number(json.interval ?? 5)
    }
  },

  async authPoll(input: { deviceCode: string }): Promise<GitHubAuthStatus> {
    const { clientId, clientSecret } = await ensureGithubOAuthCredentials()
    if (!clientSecret) {
      throw new Error(
        'GitHub OAuth Client Secret is missing. Save Client ID and Client Secret in the wizard (or set EMPRINT_GITHUB_CLIENT_SECRET) before signing in.'
      )
    }

    const body = new URLSearchParams()
    body.set('client_id', clientId)
    body.set('device_code', input.deviceCode)
    body.set('grant_type', DEVICE_CODE_GRANT_TYPE)
    body.set('client_secret', clientSecret)

    const res = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body
    })

    if (!res.ok) {
      const message = await safeReadText(res)
      throw new Error(`GitHub token polling failed (${res.status}): ${message}`)
    }

    const json = (await res.json()) as {
      access_token?: string
      error?: string
      error_description?: string
    }

    if (json.error) {
      if (json.error === 'authorization_pending') {
        return { connected: false }
      }
      if (json.error === 'slow_down') {
        const detail = json.error_description ? ` (${json.error_description})` : ''
        throw new Error(`GitHub auth error: slow_down${detail}`)
      }
      if (json.error === 'expired_token') {
        throw new Error('GitHub device code expired. Please restart sign-in.')
      }
      throw new Error(formatGithubAuthPollError(json.error, json.error_description))
    }

    if (!json.access_token) {
      throw new Error(`Unexpected GitHub token response: ${JSON.stringify(json)}`)
    }

    const token = json.access_token
    const viewer = await githubApiGet('https://api.github.com/user', token)
    const login = typeof viewer.login === 'string' ? viewer.login : ''
    if (!login) {
      throw new Error('Failed to verify GitHub user profile.')
    }

    await writeGithubSession({
      accessToken: token,
      login,
      createdAt: new Date().toISOString()
    })

    const mountedRoot = workspaceRuntime.mountedRoot
    if (mountedRoot) {
      await syncSiteCopyrightHolder(mountedRoot)
    }

    return { connected: true, login }
  },

  async logout(): Promise<void> {
    await performGithubLogout()
  },

  readSession: readGithubSession
}
