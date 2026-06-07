import { readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { legacyGithubSessionPath, sessionPath } from '../../paths.js'
import type { StoredAuthSession } from '../../types.js'

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

export async function writeGithubSession(session: StoredAuthSession): Promise<void> {
  await writeFile(sessionPath('github'), JSON.stringify(session, null, 2), 'utf8')
}

export async function deleteGithubSession(): Promise<void> {
  try {
    await writeFile(sessionPath('github'), 'null', 'utf8')
  } catch {
    /* ignore */
  }
}
