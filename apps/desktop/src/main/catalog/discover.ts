import { readdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import simpleGit from 'simple-git'
import type { CatalogReconcileResult, WorkspaceCatalogEntry, WorkspaceManifest } from '@emprint/shared'
import { parseWorkspaceManifestJson } from '@emprint/shared'
import type { Dirent } from 'node:fs'
import { MANIFEST_RELATIVE_PATH } from '@emprint/shared'
import { readCatalog, writeCatalog } from './catalog-store'
import { readPortableCatalog, writePortableCatalog } from './portable-catalog'

function isUnderWorkspaceRoot(localDirectory: string, workspaceRoot: string): boolean {
  if (!localDirectory.trim()) return false
  const resolved = path.resolve(localDirectory)
  const root = path.resolve(workspaceRoot)
  const rel = path.relative(root, resolved)
  if (!rel || rel === '.') return false
  return !rel.startsWith('..') && !path.isAbsolute(rel)
}

/** Catalog rows not yet bound to an on-disk anthology path (e.g. QA seeds, pending setup). */
function isUnresolvedCatalogEntry(entry: WorkspaceCatalogEntry): boolean {
  return !entry.localDirectory.trim()
}

async function readGitOriginUrl(anthologyDir: string): Promise<string | undefined> {
  try {
    const git = simpleGit(anthologyDir)
    const remotes = await git.getRemotes(true)
    const origin = remotes.find((r) => r.name === 'origin') ?? remotes[0]
    const url = origin?.refs.push || origin?.refs.fetch
    return url?.trim() || undefined
  } catch {
    return undefined
  }
}

type ScannedAnthology = {
  manifest: WorkspaceManifest
  localDirectory: string
  remoteUrl?: string
  manifestMtime: Date
}

async function scanAnthologiesOnDisk(workspaceRootDir: string): Promise<ScannedAnthology[]> {
  const root = path.resolve(workspaceRootDir.trim())
  let dirents: Dirent<string>[]
  try {
    dirents = (await readdir(root, { withFileTypes: true })) as Dirent<string>[]
  } catch {
    return []
  }

  const found: ScannedAnthology[] = []

  for (const dirent of dirents) {
    if (!dirent.isDirectory()) continue
    if (dirent.name.startsWith('.')) continue

    const localDirectory = path.join(root, dirent.name)
    const manifestPath = path.join(localDirectory, MANIFEST_RELATIVE_PATH)

    try {
      const raw = await readFile(manifestPath, 'utf8')
      const manifest = parseWorkspaceManifestJson(raw)
      if (!manifest) continue

      const manifestStat = await stat(manifestPath)
      const remoteUrl = await readGitOriginUrl(localDirectory)
      found.push({
        manifest,
        localDirectory,
        ...(remoteUrl ? { remoteUrl } : {}),
        manifestMtime: manifestStat.mtime
      })
    } catch {
      /* not an emprint anthology */
    }
  }

  return found
}

function uniqueCatalogId(baseId: string, localDirectory: string, used: Set<string>): string {
  let id = baseId
  if (!used.has(id)) {
    used.add(id)
    return id
  }
  const suffix = path.basename(localDirectory).replace(/[^\p{Letter}\p{Number}]+/gu, '-').replace(/^-+|-+$/g, '')
  id = suffix ? `${baseId}-${suffix}` : `${baseId}-2`
  let n = 2
  while (used.has(id)) {
    id = `${baseId}-${n}`
    n += 1
  }
  used.add(id)
  return id
}

function mergePortableHints(
  scanned: ScannedAnthology[],
  portable: WorkspaceCatalogEntry[]
): ScannedAnthology[] {
  if (portable.length === 0) return scanned
  const byPath = new Map(portable.map((e) => [path.resolve(e.localDirectory), e]))
  return scanned.map((item) => {
    const hint = byPath.get(path.resolve(item.localDirectory))
    if (!hint) return item
    return {
      ...item,
      ...(hint.remoteUrl && !item.remoteUrl ? { remoteUrl: hint.remoteUrl } : {}),
      manifest: {
        ...item.manifest,
        title: item.manifest.title || hint.title
      }
    }
  })
}

/**
 * Rebuild the app catalog from disk under `workspaceRootDir`.
 * Drops entries outside the current root; adds/updates anthologies with a valid manifest.
 * Rows with an empty `localDirectory` are kept until bound to a folder under the root.
 */
export async function reconcileWorkspaceCatalog(workspaceRootDir: string): Promise<CatalogReconcileResult> {
  const root = path.resolve(workspaceRootDir.trim())
  const existing = await readCatalog()
  const portable = await readPortableCatalog(root)
  const scanned = mergePortableHints(await scanAnthologiesOnDisk(root), portable)

  const previousUnderRoot = existing.filter((e) => isUnderWorkspaceRoot(e.localDirectory, root))
  const byPath = new Map(previousUnderRoot.map((e) => [path.resolve(e.localDirectory), e]))

  let added = 0
  let updated = 0
  const usedIds = new Set<string>()
  const next: WorkspaceCatalogEntry[] = []
  const now = new Date().toISOString()

  for (const item of scanned) {
    const resolvedDir = path.resolve(item.localDirectory)
    const prev = byPath.get(resolvedDir)
    const baseId = item.manifest.name.trim()
    const id = prev?.id ?? uniqueCatalogId(baseId, resolvedDir, usedIds)
    if (prev?.id) usedIds.add(id)

    const remoteUrl = item.remoteUrl ?? prev?.remoteUrl
    const entry: WorkspaceCatalogEntry = {
      id,
      title: item.manifest.title.trim(),
      localDirectory: resolvedDir,
      ...(remoteUrl ? { remoteUrl } : {}),
      createdAt: prev?.createdAt ?? item.manifestMtime.toISOString() ?? now,
      updatedAt: now
    }

    if (!prev) {
      added += 1
    } else if (
      prev.title !== entry.title ||
      prev.remoteUrl !== entry.remoteUrl ||
      prev.id !== entry.id
    ) {
      updated += 1
    }

    next.push(entry)
    byPath.delete(resolvedDir)
  }

  for (const entry of existing) {
    if (!isUnresolvedCatalogEntry(entry)) continue
    if (next.some((row) => row.id === entry.id)) continue
    next.push({ ...entry, updatedAt: now })
  }

  const removedStaleUnderRoot = byPath.size
  const removedOtherRoots = existing.filter(
    (e) => !isUnderWorkspaceRoot(e.localDirectory, root) && !isUnresolvedCatalogEntry(e)
  ).length
  const removed = removedStaleUnderRoot + removedOtherRoots

  await writeCatalog(next)
  await writePortableCatalog(
    root,
    next.filter((e) => isUnderWorkspaceRoot(e.localDirectory, root))
  )

  return {
    entries: next,
    added,
    removed,
    updated
  }
}

/** Keep `{workspaceRoot}/.emprint/catalog.json` in sync after a single add/remove. */
export async function syncPortableCatalogForAnthology(
  anthologyLocalDirectory: string,
  catalog: WorkspaceCatalogEntry[]
): Promise<void> {
  const workspaceRoot = path.dirname(path.resolve(anthologyLocalDirectory))
  const slice = catalog.filter((e) => isUnderWorkspaceRoot(e.localDirectory, workspaceRoot))
  await writePortableCatalog(workspaceRoot, slice)
}
