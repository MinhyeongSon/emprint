import path from 'node:path'
import { homedir } from 'node:os'
import { readdir, rm, stat } from 'node:fs/promises'
import { app } from 'electron'

export function toPosixWorkspacePath(filePath: string): string {
  return filePath.split(path.sep).join('/')
}

export function isValidSrcEntryName(name: string): boolean {
  if (!name || name === '.' || name === '..') return false
  if (/[\\/]/.test(name)) return false
  if (!name.trim()) return false
  return true
}

/** Removes the workspace directory tree. Skips missing paths; refuses a few protected roots. */
export async function removeWorkspaceFromDisk(localDirectory: string): Promise<void> {
  const resolved = path.resolve(localDirectory.trim())
  if (!resolved) {
    throw new Error('Invalid workspace path.')
  }

  const home = path.resolve(homedir())
  const userData = path.resolve(app.getPath('userData'))
  if (resolved === home || resolved === userData) {
    throw new Error('Cannot remove a protected system folder.')
  }

  const root = path.parse(resolved).root
  if (resolved === path.resolve(root)) {
    throw new Error('Cannot remove filesystem root.')
  }

  let stats: Awaited<ReturnType<typeof stat>>
  try {
    stats = await stat(resolved)
  } catch (err: unknown) {
    const code = err && typeof err === 'object' && 'code' in err ? (err as NodeJS.ErrnoException).code : ''
    if (code === 'ENOENT') {
      return
    }
    throw err
  }

  if (!stats.isDirectory()) {
    throw new Error('Workspace path is not a directory.')
  }

  await rm(resolved, { recursive: true, force: true })
}

export async function safeListDirectory(directory: string): Promise<string[]> {
  try {
    return await readdir(directory)
  } catch {
    return []
  }
}
