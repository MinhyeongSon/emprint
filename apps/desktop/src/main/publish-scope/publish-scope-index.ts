import { existsSync } from 'node:fs'
import { readFile, readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import {
  classifyAssetPublishScope,
  isNonPublishableAssetScope,
  normalizePublishPendingPath,
  WORKSPACE_DIR,
  type AssetReference
} from '@emprint/shared'
import { parseKnowledgeSummary } from '@emprint/core'
import { summarizeMarkdown } from '../ipc/markdown-summary'
import {
  postSectionFromPath,
  publishedMarkdownSection,
  resolveWorkspaceSiteProjectKind
} from '../workspace/path-safety'
import { ASSET_IMAGE_MIME_ALLOWLIST, extractMarkdownImageRefs, normalizeReferenceTarget } from '../workspace/assets-image'
import { safeListDirectory } from '../workspace/workspace-path'
import { flatDirFingerprint, publishScopeFingerprint } from './fingerprint'

/** Incremental index: which posts reference which images (for publish-scope). */
export type IncrementalPublishScopeIndex = {
  postsFp: string
  draftsFp: string
  assetsFp: string
  imageByKey: Map<string, string>
  imagePaths: Set<string>
  refsByImage: Map<string, AssetReference[]>
  /** post path → last scanned mtime */
  postMtimes: Map<string, number>
}

export type WorkspacePublishScopeCache = {
  fingerprint: string
  index: IncrementalPublishScopeIndex
  nonPublishable: Set<string>
  appliedNonPublishableKey: string | null
  excludeWrittenKey: string | null
}

export const publishScopeCacheByWorkspace = new Map<string, WorkspacePublishScopeCache>()

export function publishScopeCacheKey(workspaceRoot: string): string {
  return path.resolve(workspaceRoot)
}

export function nonPublishableSetKey(paths: Set<string>): string {
  return [...paths].sort().join('\n')
}

/** Drop cached publish-scope index (e.g. migration). */
export function invalidateWorkspacePublishScopeCache(workspaceRoot: string): void {
  publishScopeCacheByWorkspace.delete(publishScopeCacheKey(workspaceRoot))
}

function removePostFromPublishScopeIndex(index: IncrementalPublishScopeIndex, postPath: string): void {
  index.postMtimes.delete(postPath)
  for (const [imagePath, refs] of index.refsByImage) {
    const next = refs.filter((r) => r.postPath !== postPath)
    if (next.length !== refs.length) {
      index.refsByImage.set(imagePath, next)
    }
  }
}

function registerImagePath(index: IncrementalPublishScopeIndex, imagePath: string): void {
  const rel = normalizePublishPendingPath(imagePath)
  index.imagePaths.add(rel)
  index.imageByKey.set(rel, rel)
  index.imageByKey.set(path.basename(rel), rel)
  if (!index.refsByImage.has(rel)) {
    index.refsByImage.set(rel, [])
  }
}

function unregisterImagePath(index: IncrementalPublishScopeIndex, imagePath: string): void {
  const rel = normalizePublishPendingPath(imagePath)
  index.imagePaths.delete(rel)
  index.refsByImage.delete(rel)
  for (const [key, target] of [...index.imageByKey.entries()]) {
    if (target === rel) index.imageByKey.delete(key)
  }
}

function collectRefsFromMarkdown(
  postRelPath: string,
  content: string,
  section: AssetReference['section'],
  imageByKey: Map<string, string>,
  titleFallback: string
): Array<{ imagePath: string; reference: AssetReference }> {
  const summary = { title: titleFallback }
  const hits: Array<{ imagePath: string; reference: AssetReference }> = []
  for (const ref of extractMarkdownImageRefs(content)) {
    const target = normalizeReferenceTarget(ref)
    if (!target) continue
    const imagePath = imageByKey.get(target) ?? imageByKey.get(target.split('/').pop()!)
    if (!imagePath) continue
    hits.push({
      imagePath,
      reference: { postPath: postRelPath, postTitle: summary.title, section }
    })
  }
  return hits
}

function applyPostRefsToIndex(
  index: IncrementalPublishScopeIndex,
  hits: Array<{ imagePath: string; reference: AssetReference }>
): void {
  for (const { imagePath, reference } of hits) {
    const refs = index.refsByImage.get(imagePath)
    if (!refs) continue
    if (refs.some((r) => r.postPath === reference.postPath)) continue
    refs.push(reference)
  }
}

async function syncAssetCatalogInIndex(
  workspaceRoot: string,
  index: IncrementalPublishScopeIndex
): Promise<void> {
  const imagesDir = path.join(workspaceRoot, WORKSPACE_DIR.assetsImages)
  const onDisk = new Set<string>()
  if (existsSync(imagesDir)) {
    const dirents = await readdir(imagesDir, { withFileTypes: true })
    for (const ent of dirents) {
      if (!ent.isFile()) continue
      const ext = ent.name.split('.').pop()?.toLowerCase() ?? ''
      if (!Object.values(ASSET_IMAGE_MIME_ALLOWLIST).includes(ext)) continue
      onDisk.add(normalizePublishPendingPath(`${WORKSPACE_DIR.assetsImages}/${ent.name}`))
    }
  }

  for (const rel of onDisk) {
    if (!index.imagePaths.has(rel)) registerImagePath(index, rel)
  }
  for (const rel of [...index.imagePaths]) {
    if (!onDisk.has(rel)) unregisterImagePath(index, rel)
  }

  index.assetsFp = await flatDirFingerprint(imagesDir)
}

async function refreshPostInPublishScopeIndex(
  workspaceRoot: string,
  index: IncrementalPublishScopeIndex,
  postPath: string,
  content?: string
): Promise<void> {
  const section = postSectionFromPath(postPath)
  if (!section) return

  removePostFromPublishScopeIndex(index, postPath)

  const abs = path.join(workspaceRoot, postPath)
  let mtimeMs = 0
  let body = content
  try {
    const st = await stat(abs)
    if (!st.isFile()) return
    mtimeMs = st.mtimeMs
    if (body === undefined) {
      body = await readFile(abs, 'utf8')
    }
  } catch {
    return
  }

  index.postMtimes.set(postPath, mtimeMs)
  const title =
    section === 'knowledge'
      ? parseKnowledgeSummary(postPath, body).title
      : summarizeMarkdown(postPath, body, '').title
  const hits = collectRefsFromMarkdown(postPath, body, section, index.imageByKey, title)
  applyPostRefsToIndex(index, hits)
}

async function incrementalUpdatePostSection(
  workspaceRoot: string,
  index: IncrementalPublishScopeIndex,
  section: 'posts' | 'drafts' | 'knowledge' | 'story'
): Promise<void> {
  const dir = path.join(workspaceRoot, section)
  const present = new Set<string>()

  if (existsSync(dir)) {
    const files = await safeListDirectory(dir)
    for (const fileName of files) {
      if (!fileName.toLowerCase().endsWith('.md')) continue
      const postRelPath = `${section}/${fileName}`
      present.add(postRelPath)

      const abs = path.join(dir, fileName)
      let mtimeMs = 0
      try {
        mtimeMs = (await stat(abs)).mtimeMs
      } catch {
        continue
      }

      if (index.postMtimes.get(postRelPath) === mtimeMs) continue
      await refreshPostInPublishScopeIndex(workspaceRoot, index, postRelPath)
    }
  }

  for (const tracked of [...index.postMtimes.keys()]) {
    if (tracked.startsWith(`${section}/`) && !present.has(tracked)) {
      removePostFromPublishScopeIndex(index, tracked)
    }
  }

  const fp = await flatDirFingerprint(dir)
  if (section === 'drafts') index.draftsFp = fp
  else index.postsFp = fp
}

async function buildFullPublishScopeIndex(workspaceRoot: string): Promise<IncrementalPublishScopeIndex> {
  const kind = resolveWorkspaceSiteProjectKind(workspaceRoot)
  const published = publishedMarkdownSection(kind)
  const index: IncrementalPublishScopeIndex = {
    postsFp: '',
    draftsFp: '',
    assetsFp: '',
    imageByKey: new Map(),
    imagePaths: new Set(),
    refsByImage: new Map(),
    postMtimes: new Map()
  }

  if (kind === 'fragments') {
    index.postsFp = await flatDirFingerprint(path.join(workspaceRoot, WORKSPACE_DIR.artwork))
    return index
  }

  if (kind === 'book') {
    index.postsFp = await flatDirFingerprint(path.join(workspaceRoot, WORKSPACE_DIR.story))
    await incrementalUpdatePostSection(workspaceRoot, index, 'story')
    return index
  }

  await syncAssetCatalogInIndex(workspaceRoot, index)
  await incrementalUpdatePostSection(workspaceRoot, index, published)
  await incrementalUpdatePostSection(workspaceRoot, index, 'drafts')
  return index
}

async function incrementalUpdatePublishScopeIndex(
  workspaceRoot: string,
  index: IncrementalPublishScopeIndex
): Promise<IncrementalPublishScopeIndex> {
  const kind = resolveWorkspaceSiteProjectKind(workspaceRoot)
  if (kind === 'fragments') {
    const artworkFp = await flatDirFingerprint(path.join(workspaceRoot, WORKSPACE_DIR.artwork))
    if (artworkFp !== index.postsFp) index.postsFp = artworkFp
    return index
  }

  if (kind === 'book') {
    const storyFp = await flatDirFingerprint(path.join(workspaceRoot, WORKSPACE_DIR.story))
    if (storyFp !== index.postsFp) {
      index.postsFp = storyFp
      await incrementalUpdatePostSection(workspaceRoot, index, 'story')
    }
    return index
  }

  const published = publishedMarkdownSection(kind)
  const [publishedFp, draftsFp, assetsFp] = await Promise.all([
    flatDirFingerprint(path.join(workspaceRoot, published)),
    flatDirFingerprint(path.join(workspaceRoot, WORKSPACE_DIR.drafts)),
    flatDirFingerprint(path.join(workspaceRoot, WORKSPACE_DIR.assetsImages))
  ])

  if (assetsFp !== index.assetsFp) {
    await syncAssetCatalogInIndex(workspaceRoot, index)
  }
  if (publishedFp !== index.postsFp) {
    await incrementalUpdatePostSection(workspaceRoot, index, published)
  }
  if (draftsFp !== index.draftsFp) {
    await incrementalUpdatePostSection(workspaceRoot, index, 'drafts')
  }

  return index
}

export function nonPublishablePathsFromIndex(index: IncrementalPublishScopeIndex): Set<string> {
  const paths = new Set<string>()
  for (const imagePath of index.imagePaths) {
    const refs = index.refsByImage.get(imagePath) ?? []
    if (isNonPublishableAssetScope(classifyAssetPublishScope(refs))) {
      paths.add(imagePath)
    }
  }
  return paths
}

export function writePublishScopeCacheEntry(
  workspaceRoot: string,
  index: IncrementalPublishScopeIndex,
  fingerprint: string,
  nonPublishable: Set<string>
): void {
  const key = publishScopeCacheKey(workspaceRoot)
  const prev = publishScopeCacheByWorkspace.get(key)
  publishScopeCacheByWorkspace.set(key, {
    fingerprint,
    index,
    nonPublishable,
    appliedNonPublishableKey: prev?.appliedNonPublishableKey ?? null,
    excludeWrittenKey: prev?.excludeWrittenKey ?? null
  })
}

export async function ensurePublishScopeIndex(workspaceRoot: string): Promise<IncrementalPublishScopeIndex> {
  const key = publishScopeCacheKey(workspaceRoot)
  const cached = publishScopeCacheByWorkspace.get(key)
  if (cached?.index) {
    return await incrementalUpdatePublishScopeIndex(workspaceRoot, cached.index)
  }
  return await buildFullPublishScopeIndex(workspaceRoot)
}

/** Scan all image publish scopes (full rebuild). */
export async function collectNonPublishableAssetPaths(workspaceRoot: string): Promise<Set<string>> {
  const index = await buildFullPublishScopeIndex(workspaceRoot)
  return nonPublishablePathsFromIndex(index)
}

export async function resolveNonPublishableAssetPathsCached(workspaceRoot: string): Promise<Set<string>> {
  const key = publishScopeCacheKey(workspaceRoot)
  const fingerprint = await publishScopeFingerprint(workspaceRoot)
  const cached = publishScopeCacheByWorkspace.get(key)
  if (cached?.fingerprint === fingerprint) {
    return cached.nonPublishable
  }

  const index = cached?.index
    ? await incrementalUpdatePublishScopeIndex(workspaceRoot, cached.index)
    : await buildFullPublishScopeIndex(workspaceRoot)
  const nonPublishable = nonPublishablePathsFromIndex(index)
  writePublishScopeCacheEntry(workspaceRoot, index, fingerprint, nonPublishable)
  return nonPublishable
}

/** Update one post in the incremental index (after save). */
export async function applyPostPublishScopeChange(
  workspaceRoot: string,
  postPath: string,
  content?: string
): Promise<void> {
  const key = publishScopeCacheKey(workspaceRoot)
  const index =
    publishScopeCacheByWorkspace.get(key)?.index ?? (await buildFullPublishScopeIndex(workspaceRoot))
  await refreshPostInPublishScopeIndex(workspaceRoot, index, postPath, content)
  const fingerprint = await publishScopeFingerprint(workspaceRoot)
  writePublishScopeCacheEntry(workspaceRoot, index, fingerprint, nonPublishablePathsFromIndex(index))
}

/** Update index after posts/drafts move. */
export async function applyPostsMovePublishScope(
  workspaceRoot: string,
  fromPath: string,
  toPath: string
): Promise<void> {
  const index = await ensurePublishScopeIndex(workspaceRoot)
  removePostFromPublishScopeIndex(index, fromPath)
  await refreshPostInPublishScopeIndex(workspaceRoot, index, toPath)
  const fingerprint = await publishScopeFingerprint(workspaceRoot)
  writePublishScopeCacheEntry(workspaceRoot, index, fingerprint, nonPublishablePathsFromIndex(index))
}

/** Update index after post delete. */
export async function applyPostDeletePublishScope(workspaceRoot: string, postPath: string): Promise<void> {
  const key = publishScopeCacheKey(workspaceRoot)
  const cached = publishScopeCacheByWorkspace.get(key)
  if (!cached?.index) return
  removePostFromPublishScopeIndex(cached.index, postPath)
  const fingerprint = await publishScopeFingerprint(workspaceRoot)
  writePublishScopeCacheEntry(
    workspaceRoot,
    cached.index,
    fingerprint,
    nonPublishablePathsFromIndex(cached.index)
  )
}

/** Update index after asset file add/remove. */
export async function applyAssetCatalogPublishScope(workspaceRoot: string): Promise<void> {
  const index = await ensurePublishScopeIndex(workspaceRoot)
  await syncAssetCatalogInIndex(workspaceRoot, index)
  const fingerprint = await publishScopeFingerprint(workspaceRoot)
  writePublishScopeCacheEntry(workspaceRoot, index, fingerprint, nonPublishablePathsFromIndex(index))
}
