import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import simpleGit from 'simple-git'
import { emprintGitignoreEnsuredRoots, ensureEmprintGitignore, untrackEmprintIgnoredPathsOnce } from '../workspace/gitignore'
import { publishScopeFingerprint } from './fingerprint'
import {
  ensurePublishScopeIndex,
  nonPublishablePathsFromIndex,
  nonPublishableSetKey,
  publishScopeCacheByWorkspace,
  publishScopeCacheKey,
  writePublishScopeCacheEntry,
  type WorkspacePublishScopeCache
} from './publish-scope-index'

async function untrackNonPublishableAssets(
  git: ReturnType<typeof simpleGit>,
  paths: Set<string>
): Promise<void> {
  const rels = [...paths]
  if (rels.length === 0) return
  try {
    await git.raw(['rm', '--cached', '--ignore-unmatch', ...rels])
  } catch {
    // not tracked
  }
}

export async function unstageNonPublishableAssets(
  git: ReturnType<typeof simpleGit>,
  paths: Set<string>
): Promise<void> {
  const rels = [...paths]
  if (rels.length === 0) return
  try {
    await git.raw(['reset', 'HEAD', '--', ...rels])
  } catch {
    // path was not staged
  }
}

const GIT_EXCLUDE_NON_PUBLISHABLE_BEGIN = '# >>> emprint-non-publishable-assets'
const GIT_EXCLUDE_NON_PUBLISHABLE_END = '# <<< emprint-non-publishable-assets'

async function syncGitExcludeNonPublishableAssets(
  workspaceRoot: string,
  paths: Set<string>,
  cacheEntry: WorkspacePublishScopeCache | undefined
): Promise<void> {
  const gitDir = path.join(workspaceRoot, '.git')
  if (!existsSync(gitDir)) return

  const excludeKey = nonPublishableSetKey(paths)
  if (cacheEntry?.excludeWrittenKey === excludeKey) return

  const excludePath = path.join(gitDir, 'info', 'exclude')
  await mkdir(path.dirname(excludePath), { recursive: true })

  let preserved: string[] = []
  if (existsSync(excludePath)) {
    const raw = await readFile(excludePath, 'utf8')
    let inBlock = false
    for (const line of raw.split(/\r?\n/)) {
      if (line === GIT_EXCLUDE_NON_PUBLISHABLE_BEGIN) {
        inBlock = true
        continue
      }
      if (line === GIT_EXCLUDE_NON_PUBLISHABLE_END) {
        inBlock = false
        continue
      }
      if (!inBlock) preserved.push(line)
    }
  }

  const next = [
    ...preserved,
    GIT_EXCLUDE_NON_PUBLISHABLE_BEGIN,
    ...[...paths].sort(),
    GIT_EXCLUDE_NON_PUBLISHABLE_END,
    ''
  ]
  await writeFile(excludePath, next.join('\n'), 'utf8')
  if (cacheEntry) cacheEntry.excludeWrittenKey = excludeKey
}

export async function ensureEmprintGitignoreOnce(workspaceRoot: string): Promise<void> {
  const key = publishScopeCacheKey(workspaceRoot)
  if (emprintGitignoreEnsuredRoots.has(key)) return
  await ensureEmprintGitignore(workspaceRoot)
  emprintGitignoreEnsuredRoots.add(key)
}

/**
 * Apply git index/exclude updates only when the non-publishable asset set changed.
 */
export async function reconcilePublishScopeGit(
  workspaceRoot: string,
  nonPublishable: Set<string>
): Promise<void> {
  const cacheKey = publishScopeCacheKey(workspaceRoot)
  let cacheEntry = publishScopeCacheByWorkspace.get(cacheKey)
  if (!cacheEntry) {
    const index = await ensurePublishScopeIndex(workspaceRoot)
    cacheEntry = {
      fingerprint: await publishScopeFingerprint(workspaceRoot),
      index,
      nonPublishable,
      appliedNonPublishableKey: null,
      excludeWrittenKey: null
    }
    publishScopeCacheByWorkspace.set(cacheKey, cacheEntry)
  } else {
    cacheEntry.nonPublishable = nonPublishable
  }

  const appliedKey = nonPublishableSetKey(nonPublishable)
  const gitOpsNeeded = cacheEntry.appliedNonPublishableKey !== appliedKey

  let git: ReturnType<typeof simpleGit> | undefined
  try {
    git = simpleGit(workspaceRoot)
    if (!(await git.checkIsRepo())) {
      await syncGitExcludeNonPublishableAssets(workspaceRoot, nonPublishable, cacheEntry)
      return
    }
  } catch {
    await syncGitExcludeNonPublishableAssets(workspaceRoot, nonPublishable, cacheEntry)
    return
  }

  if (gitOpsNeeded) {
    await untrackNonPublishableAssets(git, nonPublishable)
    await unstageNonPublishableAssets(git, nonPublishable)
    cacheEntry.appliedNonPublishableKey = appliedKey
  }

  await syncGitExcludeNonPublishableAssets(workspaceRoot, nonPublishable, cacheEntry)
}

/**
 * Reconcile git index/exclude with which assets should ship on publish.
 * Call after post moves/deletes and other edits that change asset publish scope.
 */
export async function syncWorkspacePublishScope(workspaceRoot: string): Promise<Set<string>> {
  await ensureEmprintGitignoreOnce(workspaceRoot)
  await untrackEmprintIgnoredPathsOnce(workspaceRoot)
  const index = await ensurePublishScopeIndex(workspaceRoot)
  const fingerprint = await publishScopeFingerprint(workspaceRoot)
  const nonPublishable = nonPublishablePathsFromIndex(index)
  writePublishScopeCacheEntry(workspaceRoot, index, fingerprint, nonPublishable)
  await reconcilePublishScopeGit(workspaceRoot, nonPublishable)
  return nonPublishable
}
