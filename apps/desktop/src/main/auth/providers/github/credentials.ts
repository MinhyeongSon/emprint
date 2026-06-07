import { readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { legacyGithubOAuthClientPath, oauthClientPath } from '../../paths.js'

export type StoredGitHubOAuthClient = {
  clientId: string
  clientSecret?: string
  updatedAt: string
}

export function resolveEnvClientSecret(): string | undefined {
  const secret = process.env.EMPRINT_GITHUB_CLIENT_SECRET || process.env.GITHUB_CLIENT_SECRET
  return secret?.trim() || undefined
}

export function oauthClientHasSecret(stored: StoredGitHubOAuthClient | null): boolean {
  return Boolean(stored?.clientSecret?.trim() || resolveEnvClientSecret())
}

export async function readOAuthClientFile(filePath: string): Promise<StoredGitHubOAuthClient | null> {
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

export async function readGithubOAuthClient(): Promise<StoredGitHubOAuthClient | null> {
  const primary = oauthClientPath('github')
  const stored = await readOAuthClientFile(primary)
  if (stored) return stored
  if (existsSync(legacyGithubOAuthClientPath())) {
    return readOAuthClientFile(legacyGithubOAuthClientPath())
  }
  return null
}

export async function writeGithubOAuthClient(input: { clientId: string; clientSecret?: string }): Promise<void> {
  const clientSecret = input.clientSecret?.trim() || undefined
  const next: StoredGitHubOAuthClient = {
    clientId: input.clientId,
    updatedAt: new Date().toISOString(),
    ...(clientSecret ? { clientSecret } : {})
  }
  await writeFile(oauthClientPath('github'), JSON.stringify(next, null, 2), 'utf8')
}

let cachedGithubClientId: string | undefined

export async function refreshCachedGithubClientId(): Promise<void> {
  const stored = await readGithubOAuthClient()
  cachedGithubClientId = stored?.clientId
}

export async function resolveGithubOAuthCredentials(): Promise<{ clientId: string; clientSecret?: string } | null> {
  await refreshCachedGithubClientId()
  const stored = await readGithubOAuthClient()
  const clientId =
    stored?.clientId || process.env.EMPRINT_GITHUB_CLIENT_ID || process.env.GITHUB_CLIENT_ID || undefined
  if (!clientId) return null
  const clientSecret = stored?.clientSecret || resolveEnvClientSecret()
  return { clientId, ...(clientSecret ? { clientSecret } : {}) }
}

export async function ensureGithubOAuthCredentials(): Promise<{ clientId: string; clientSecret?: string }> {
  const creds = await resolveGithubOAuthCredentials()
  if (!creds?.clientId) {
    throw new Error('GitHub OAuth Client ID is missing. Please set it in the app (Wizard) first.')
  }
  return creds
}
