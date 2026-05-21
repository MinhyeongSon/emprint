import path from 'node:path'
import { app } from 'electron'
import type { AuthProviderId } from './types'

export function oauthClientPath(providerId: AuthProviderId): string {
  return path.join(app.getPath('userData'), `${providerId}-oauth-client.json`)
}

export function sessionPath(providerId: AuthProviderId): string {
  return path.join(app.getPath('userData'), `${providerId}-session.json`)
}

/** Legacy filenames (pre-provider); used when new path missing. */
export function legacyGithubOAuthClientPath(): string {
  return path.join(app.getPath('userData'), 'github-oauth-client.json')
}

export function legacyGithubSessionPath(): string {
  return path.join(app.getPath('userData'), 'github-session.json')
}
