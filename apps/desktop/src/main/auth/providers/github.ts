import { readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import type {
  GitHubAuthStatus,
  GitHubDeviceCode,
  GitHubOAuthClientConfig
} from '@emprint/shared'
import { safeReadText } from '../http-utils.js'
import {
  legacyGithubOAuthClientPath,
  legacyGithubSessionPath,
  oauthClientPath,
  sessionPath
} from '../paths.js'
import type { AuthProvider, StoredAuthSession } from '../types.js'

type StoredGitHubOAuthClient = {
  clientId: string
  clientSecret?: string
  updatedAt: string
}

function resolveEnvClientSecret(): string | undefined {
  const secret = process.env.EMPRINT_GITHUB_CLIENT_SECRET || process.env.GITHUB_CLIENT_SECRET
  return secret?.trim() || undefined
}

function oauthClientHasSecret(stored: StoredGitHubOAuthClient | null): boolean {
  return Boolean(stored?.clientSecret?.trim() || resolveEnvClientSecret())
}

async function readOAuthClientFile(filePath: string): Promise<StoredGitHubOAuthClient | null> {
  try {
    const raw = await readFile(filePath, 'utf8')
    const parsed = JSON.parse(raw) as Partial<StoredGitHubOAuthClient>
    if (!parsed.clientId) return null
    const clientSecret =
      typeof parsed.clientSecret === 'string' && parsed.clientSecret.trim()
        ? parsed.clientSecret.trim()
        : undefined
    return {
      clientId: String(parsed.clientId),
      ...(clientSecret ? { clientSecret } : {}),
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString()
    }
  } catch {
    return null
  }
}

async function readGithubOAuthClient(): Promise<StoredGitHubOAuthClient | null> {
  const primary = oauthClientPath('github')
  const stored = await readOAuthClientFile(primary)
  if (stored) return stored
  if (existsSync(legacyGithubOAuthClientPath())) {
    return readOAuthClientFile(legacyGithubOAuthClientPath())
  }
  return null
}

async function writeGithubOAuthClient(input: { clientId: string; clientSecret?: string }): Promise<void> {
  const clientSecret = input.clientSecret?.trim() || undefined
  const next: StoredGitHubOAuthClient = {
    clientId: input.clientId,
    updatedAt: new Date().toISOString(),
    ...(clientSecret ? { clientSecret } : {})
  }
  await writeFile(oauthClientPath('github'), JSON.stringify(next, null, 2), 'utf8')
}

async function resolveGithubOAuthCredentials(): Promise<{ clientId: string; clientSecret?: string } | null> {
  await refreshCachedGithubClientId()
  const stored = await readGithubOAuthClient()
  const clientId =
    stored?.clientId || process.env.EMPRINT_GITHUB_CLIENT_ID || process.env.GITHUB_CLIENT_ID || undefined
  if (!clientId) return null
  const clientSecret = stored?.clientSecret || resolveEnvClientSecret()
  return { clientId, ...(clientSecret ? { clientSecret } : {}) }
}

let cachedGithubClientId: string | undefined

async function refreshCachedGithubClientId(): Promise<void> {
  const stored = await readGithubOAuthClient()
  cachedGithubClientId = stored?.clientId
}

function ensureGithubClientId(): string {
  const clientId =
    cachedGithubClientId || process.env.EMPRINT_GITHUB_CLIENT_ID || process.env.GITHUB_CLIENT_ID
  if (!clientId) {
    throw new Error('GitHub OAuth Client ID is missing. Please set it in the app (Wizard) first.')
  }
  return clientId
}

async function readSessionFile(filePath: string): Promise<StoredAuthSession | null> {
  try {
    const raw = await readFile(filePath, 'utf8')
    const parsed = JSON.parse(raw) as Partial<StoredAuthSession>
    if (!parsed.accessToken || !parsed.login) return null
    return {
      accessToken: String(parsed.accessToken),
      login: String(parsed.login),
      createdAt: typeof parsed.createdAt === 'string' ? parsed.createdAt : new Date().toISOString()
    }
  } catch {
    return null
  }
}

export async function readGithubSession(): Promise<StoredAuthSession | null> {
  const primary = sessionPath('github')
  const stored = await readSessionFile(primary)
  if (stored) return stored
  if (existsSync(legacyGithubSessionPath())) {
    return readSessionFile(legacyGithubSessionPath())
  }
  return null
}

async function writeGithubSession(session: StoredAuthSession): Promise<void> {
  await writeFile(sessionPath('github'), JSON.stringify(session, null, 2), 'utf8')
}

async function deleteGithubSession(): Promise<void> {
  try {
    await writeFile(sessionPath('github'), 'null', 'utf8')
  } catch {
    /* ignore */
  }
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

async function revokeGithubAccessToken(accessToken: string): Promise<void> {
  const creds = await resolveGithubOAuthCredentials()
  if (!creds?.clientId) {
    console.warn('[emprint] Skipping GitHub token revoke: OAuth Client ID is not configured.')
    return
  }

  const { clientId, clientSecret } = creds
  if (!clientSecret) {
    console.warn(
      '[emprint] Skipping GitHub token revoke: Client Secret is not set. Add it in Settings (or EMPRINT_GITHUB_CLIENT_SECRET) so logout invalidates the token on GitHub.'
    )
    return
  }

  const revokeBody = new URLSearchParams()
  revokeBody.set('client_id', clientId)
  revokeBody.set('client_secret', clientSecret)
  revokeBody.set('token', accessToken)

  const revokeRes = await fetch('https://github.com/login/oauth/revoke', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: revokeBody
  })

  if (revokeRes.ok) return

  const basic = Buffer.from(`${clientId}:${clientSecret}`, 'utf8').toString('base64')
  const deleteRes = await fetch(`https://api.github.com/applications/${encodeURIComponent(clientId)}/token`, {
    method: 'DELETE',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28'
    },
    body: JSON.stringify({ access_token: accessToken })
  })

  if (deleteRes.ok || deleteRes.status === 404) return

  const message = await safeReadText(deleteRes)
  console.warn(`[emprint] GitHub token revoke failed (${deleteRes.status}): ${message}`)
}

async function githubLogout(): Promise<void> {
  const session = await readGithubSession()
  if (session?.accessToken) {
    try {
      await revokeGithubAccessToken(session.accessToken)
    } catch (caught) {
      console.warn('[emprint] GitHub token revoke error:', caught)
    }
  }
  await deleteGithubSession()
}

let githubLogoutPromise: Promise<void> | null = null

export async function performGithubLogout(): Promise<void> {
  if (!githubLogoutPromise) {
    githubLogoutPromise = githubLogout().finally(() => {
      githubLogoutPromise = null
    })
  }
  return githubLogoutPromise
}

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
    const clientSecret =
      input.clientSecret !== undefined ? input.clientSecret.trim() || undefined : existing?.clientSecret
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
    await refreshCachedGithubClientId()
    const clientId = ensureGithubClientId()
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
    await refreshCachedGithubClientId()
    const clientId = ensureGithubClientId()
    const deviceCode = input.deviceCode

    const body = new URLSearchParams()
    body.set('client_id', clientId)
    body.set('device_code', deviceCode)
    body.set('grant_type', 'urn:ietf:params:oauth:device-code')

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
      const detail = json.error_description ? ` (${json.error_description})` : ''
      throw new Error(`GitHub auth error: ${json.error}${detail}`)
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

    return { connected: true, login }
  },

  async logout(): Promise<void> {
    await performGithubLogout()
  },

  readSession: readGithubSession
}
