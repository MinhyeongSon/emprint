import path from 'node:path'
import { readFile, writeFile } from 'node:fs/promises'
import simpleGit from 'simple-git'
import { EMPRINT_GITIGNORE_LINES } from '@emprint/shared'

const gitignoreUntrackedRoots = new Set<string>()
export const emprintGitignoreEnsuredRoots = new Set<string>()

/**
 * Append a line to `.gitignore` if (and only if) no equivalent entry already
 * exists. We treat the entry conceptually — "ignore the drafts folder" — so
 * `drafts`, `/drafts`, `drafts/`, and `/drafts/` are all considered equivalent
 * and a no-op. The file is created on the fly if missing.
 */
export async function ensureGitignoreLine(workspaceRoot: string, rawLine: string): Promise<void> {
  const target = rawLine.trim()
  if (!target) return
  const filePath = path.join(workspaceRoot, '.gitignore')

  let content = ''
  try {
    content = await readFile(filePath, 'utf8')
  } catch (err) {
    const code = err && typeof err === 'object' && 'code' in err ? (err as NodeJS.ErrnoException).code : ''
    if (code !== 'ENOENT') throw err
  }

  const baseName = target.replace(/^\/+/, '').replace(/\/+$/, '')
  const variants = new Set([baseName, `${baseName}/`, `/${baseName}`, `/${baseName}/`])

  const lines = content.split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    if (variants.has(trimmed)) return
  }

  const needsLeadingNewline = content.length > 0 && !content.endsWith('\n')
  const updated = `${content}${needsLeadingNewline ? '\n' : ''}${target}\n`
  await writeFile(filePath, updated, 'utf8')
}

/** Paths emprint considers private by convention and always wants in `.gitignore`. */
export async function ensureEmprintGitignore(workspaceRoot: string): Promise<void> {
  for (const line of EMPRINT_GITIGNORE_LINES) {
    await ensureGitignoreLine(workspaceRoot, line)
  }
}

/**
 * Best-effort migration for workspaces created before `drafts/` was declared
 * private. Untrack still-indexed paths under always-ignored folders.
 */
export async function untrackEmprintIgnoredPaths(workspaceRoot: string): Promise<void> {
  let git: ReturnType<typeof simpleGit>
  try {
    git = simpleGit(workspaceRoot)
    const isRepo = await git.checkIsRepo()
    if (!isRepo) return
  } catch {
    return
  }

  for (const candidate of EMPRINT_GITIGNORE_LINES) {
    if (candidate.includes('*')) continue
    const normalized = candidate.replace(/\/+$/, '')
    if (!normalized) continue
    const rmArgs = ['rm', '--cached', '--ignore-unmatch']
    if (candidate.endsWith('/')) rmArgs.push('-r')
    rmArgs.push(normalized)
    try {
      await git.raw(rmArgs)
    } catch {
      // ignored on purpose
    }
  }
}

export function invalidateUntrackEmprintIgnoredCache(workspaceRoot: string): void {
  gitignoreUntrackedRoots.delete(path.resolve(workspaceRoot))
}

export async function untrackEmprintIgnoredPathsOnce(workspaceRoot: string): Promise<void> {
  const key = path.resolve(workspaceRoot)
  if (gitignoreUntrackedRoots.has(key)) return
  await untrackEmprintIgnoredPaths(workspaceRoot)
  gitignoreUntrackedRoots.add(key)
}
