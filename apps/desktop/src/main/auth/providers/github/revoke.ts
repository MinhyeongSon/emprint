import { safeReadText } from '../../http-utils.js'
import { logger } from '../../../logger.js'
import { ensureGithubOAuthCredentials, resolveGithubOAuthCredentials } from './credentials.js'
import { deleteGithubSession, readGithubSession } from './session.js'

async function revokeGithubAccessToken(accessToken: string): Promise<void> {
  const creds = await resolveGithubOAuthCredentials()
  if (!creds?.clientId) {
    logger.warn('Skipping GitHub token revoke: OAuth Client ID is not configured.')
    return
  }

  const { clientId, clientSecret } = creds
  if (!clientSecret) {
    logger.warn(
      'Skipping GitHub token revoke: Client Secret is not set. Add it in Settings (or EMPRINT_GITHUB_CLIENT_SECRET) so logout invalidates the token on GitHub.'
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
  logger.warn(`GitHub token revoke failed (${deleteRes.status}): ${message}`)
}

async function githubLogout(): Promise<void> {
  const session = await readGithubSession()
  if (session?.accessToken) {
    try {
      await revokeGithubAccessToken(session.accessToken)
    } catch (caught) {
      logger.warn('GitHub token revoke error:', caught)
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
