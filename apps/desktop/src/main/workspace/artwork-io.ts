import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, stat, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  ARTWORK_MANIFEST_RELATIVE_PATH,
  ARTWORK_MANIFEST_VERSION,
  MAX_FRAGMENTS_ARTWORK_COUNT,
  WORKSPACE_DIR,
  normalizeArtworkTags,
  type ArtworkAlbumUpdateInput,
  type ArtworkDeleteInput,
  type ArtworkImageInfo,
  type ArtworkListResult,
  type ArtworkManifestFile,
  type ArtworkManifestItem,
  type ArtworkReorderInput,
  type ArtworkSaveInput,
  type ArtworkUpdateInput
} from '@emprint/shared'
import { buildUniqueAssetPath, slugifyAssetBaseName } from '../ipc/core'
import { encodeArtworkAsJpeg } from './artwork-image'

function toPosixWorkspacePath(rel: string): string {
  return rel.replace(/\\/g, '/')
}

function manifestItemToInfo(item: ArtworkManifestItem, workspaceRoot: string): ArtworkImageInfo | null {
  const abs = path.join(workspaceRoot, ...item.path.split('/'))
  if (!existsSync(abs)) return null
  return {
    id: item.id,
    path: item.path,
    name: path.basename(item.path),
    title: item.title,
    ...(item.caption ? { caption: item.caption } : {}),
    ...(item.year != null ? { year: item.year } : {}),
    ...(item.medium ? { medium: item.medium } : {}),
    ...(item.tags?.length ? { tags: [...item.tags] } : {}),
    size: 0,
    mimeType: 'image/jpeg',
    modifiedAt: '',
    addedAt: item.addedAt,
    sort: item.sort
  }
}

async function hydrateArtworkInfo(
  workspaceRoot: string,
  partial: ArtworkImageInfo
): Promise<ArtworkImageInfo> {
  const abs = path.join(workspaceRoot, ...partial.path.split('/'))
  const st = await stat(abs)
  return {
    ...partial,
    size: st.size,
    modifiedAt: st.mtime.toISOString()
  }
}

export async function readArtworkManifest(workspaceRoot: string): Promise<ArtworkManifestFile> {
  const manifestPath = path.join(workspaceRoot, ARTWORK_MANIFEST_RELATIVE_PATH)
  if (!existsSync(manifestPath)) {
    return { version: ARTWORK_MANIFEST_VERSION, items: [] }
  }
  const raw = await readFile(manifestPath, 'utf8')
  const parsed = JSON.parse(raw) as ArtworkManifestFile
  if (parsed.version !== ARTWORK_MANIFEST_VERSION || !Array.isArray(parsed.items)) {
    throw new Error('Invalid artwork manifest.')
  }
  return parsed
}

export async function writeArtworkManifest(
  workspaceRoot: string,
  manifest: ArtworkManifestFile
): Promise<void> {
  const manifestPath = path.join(workspaceRoot, ARTWORK_MANIFEST_RELATIVE_PATH)
  await mkdir(path.dirname(manifestPath), { recursive: true })
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
}

export async function listArtworkImages(workspaceRoot: string): Promise<ArtworkListResult> {
  const manifest = await readArtworkManifest(workspaceRoot)
  const sorted = [...manifest.items].sort((a, b) => a.sort - b.sort)
  const items: ArtworkImageInfo[] = []
  for (const item of sorted) {
    const partial = manifestItemToInfo(item, workspaceRoot)
    if (!partial) continue
    items.push(await hydrateArtworkInfo(workspaceRoot, partial))
  }
  return {
    ...(manifest.album?.trim() ? { album: manifest.album.trim() } : {}),
    items
  }
}

export function resolveSafeArtworkPath(workspaceRoot: string, inputPath: string): string {
  const normalized = inputPath.replace(/\\/g, '/').replace(/^\/+/, '')
  if (!normalized || normalized.includes('..')) {
    throw new Error('Invalid artwork path.')
  }
  if (!normalized.startsWith(`${WORKSPACE_DIR.artwork}/`)) {
    throw new Error('Artwork path must start with artwork/.')
  }
  const abs = path.resolve(workspaceRoot, ...normalized.split('/'))
  const artworkRoot = path.resolve(workspaceRoot, WORKSPACE_DIR.artwork)
  const rel = path.relative(artworkRoot, abs)
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error('Path escapes artwork/.')
  }
  return abs
}

export async function saveArtworkImage(
  workspaceRoot: string,
  input: ArtworkSaveInput
): Promise<ArtworkImageInfo> {
  const manifest = await readArtworkManifest(workspaceRoot)
  if (manifest.items.length >= MAX_FRAGMENTS_ARTWORK_COUNT) {
    throw new Error(`Fragments allows at most ${MAX_FRAGMENTS_ARTWORK_COUNT} artworks.`)
  }

  const { bytes } = await encodeArtworkAsJpeg({
    data: input.data,
    fileName: input.fileName
  })

  const baseName = slugifyAssetBaseName(input.fileName)
  const artworkDir = path.join(workspaceRoot, WORKSPACE_DIR.artwork)
  await mkdir(artworkDir, { recursive: true })
  const absPath = buildUniqueAssetPath(artworkDir, baseName, 'jpg')
  await writeFile(absPath, bytes, { flag: 'wx' })

  const relPath = toPosixWorkspacePath(path.relative(workspaceRoot, absPath))
  const title =
    input.title?.trim() ||
    baseName.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  const id = randomUUID()
  const sort =
    manifest.items.length === 0
      ? 0
      : Math.max(...manifest.items.map((i) => i.sort), -1) + 1

  const item: ArtworkManifestItem = {
    id,
    path: relPath,
    title,
    ...(input.caption?.trim() ? { caption: input.caption.trim() } : {}),
    addedAt: new Date().toISOString(),
    sort
  }
  manifest.items.push(item)
  await writeArtworkManifest(workspaceRoot, manifest)

  const partial = manifestItemToInfo(item, workspaceRoot)
  if (!partial) throw new Error('Artwork file missing after save.')
  return hydrateArtworkInfo(workspaceRoot, partial)
}

function applyYearUpdate(item: ArtworkManifestItem, year: number | null | undefined): void {
  if (year === undefined) return
  if (year === null || !Number.isFinite(year)) {
    delete item.year
    return
  }
  const rounded = Math.round(year)
  if (rounded < 1 || rounded > 9999) {
    throw new Error('Year must be between 1 and 9999.')
  }
  item.year = rounded
}

export async function updateArtworkImage(
  workspaceRoot: string,
  input: ArtworkUpdateInput
): Promise<ArtworkImageInfo> {
  const manifest = await readArtworkManifest(workspaceRoot)
  const idx = manifest.items.findIndex((i) => i.id === input.id)
  if (idx < 0) throw new Error('Artwork not found.')
  const item = manifest.items[idx]!
  if (input.title !== undefined) item.title = input.title.trim() || item.title
  if (input.caption !== undefined) {
    const cap = input.caption.trim()
    if (cap) item.caption = cap
    else delete item.caption
  }
  if (input.year !== undefined) applyYearUpdate(item, input.year)
  if (input.medium !== undefined) {
    const medium = input.medium.trim()
    if (medium) item.medium = medium
    else delete item.medium
  }
  if (input.tags !== undefined) {
    const tags = normalizeArtworkTags(input.tags)
    if (tags.length) item.tags = tags
    else delete item.tags
  }
  await writeArtworkManifest(workspaceRoot, manifest)
  const partial = manifestItemToInfo(item, workspaceRoot)
  if (!partial) throw new Error('Artwork file missing.')
  return hydrateArtworkInfo(workspaceRoot, partial)
}

export async function updateArtworkAlbum(
  workspaceRoot: string,
  input: ArtworkAlbumUpdateInput
): Promise<ArtworkListResult> {
  const manifest = await readArtworkManifest(workspaceRoot)
  const album = input.album?.trim()
  if (album) manifest.album = album
  else delete manifest.album
  await writeArtworkManifest(workspaceRoot, manifest)
  return listArtworkImages(workspaceRoot)
}

export async function deleteArtworkImage(
  workspaceRoot: string,
  input: ArtworkDeleteInput
): Promise<void> {
  const manifest = await readArtworkManifest(workspaceRoot)
  const idx = manifest.items.findIndex((i) => i.id === input.id)
  if (idx < 0) throw new Error('Artwork not found.')
  const item = manifest.items[idx]!
  const abs = resolveSafeArtworkPath(workspaceRoot, item.path)
  if (existsSync(abs)) await unlink(abs)
  manifest.items.splice(idx, 1)
  await writeArtworkManifest(workspaceRoot, manifest)
}

export async function reorderArtworkImages(
  workspaceRoot: string,
  input: ArtworkReorderInput
): Promise<ArtworkImageInfo[]> {
  const manifest = await readArtworkManifest(workspaceRoot)
  const byId = new Map(manifest.items.map((i) => [i.id, i]))
  if (input.orderedIds.length !== manifest.items.length) {
    throw new Error('Reorder must include every artwork id.')
  }
  input.orderedIds.forEach((id, sort) => {
    const item = byId.get(id)
    if (!item) throw new Error(`Unknown artwork id: ${id}`)
    item.sort = sort
  })
  await writeArtworkManifest(workspaceRoot, manifest)
  const result = await listArtworkImages(workspaceRoot)
  return result.items
}
