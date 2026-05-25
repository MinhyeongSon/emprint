import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, stat, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  ARTWORK_MANIFEST_RELATIVE_PATH,
  ARTWORK_MANIFEST_VERSION,
  MAX_FRAGMENTS_ARTWORK_COUNT,
  WORKSPACE_DIR,
  type ArtworkDeleteInput,
  type ArtworkImageInfo,
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

export async function listArtworkImages(workspaceRoot: string): Promise<ArtworkImageInfo[]> {
  const manifest = await readArtworkManifest(workspaceRoot)
  const sorted = [...manifest.items].sort((a, b) => a.sort - b.sort)
  const out: ArtworkImageInfo[] = []
  for (const item of sorted) {
    const abs = path.join(workspaceRoot, ...item.path.split('/'))
    if (!existsSync(abs)) continue
    const st = await stat(abs)
    out.push({
      id: item.id,
      path: item.path,
      name: path.basename(item.path),
      title: item.title,
      ...(item.caption ? { caption: item.caption } : {}),
      size: st.size,
      mimeType: 'image/jpeg',
      modifiedAt: st.mtime.toISOString(),
      addedAt: item.addedAt,
      sort: item.sort
    })
  }
  return out
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

  const st = await stat(absPath)
  return {
    id: item.id,
    path: item.path,
    name: path.basename(absPath),
    title: item.title,
    ...(item.caption ? { caption: item.caption } : {}),
    size: st.size,
    mimeType: 'image/jpeg',
    modifiedAt: st.mtime.toISOString(),
    addedAt: item.addedAt,
    sort: item.sort
  }
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
  await writeArtworkManifest(workspaceRoot, manifest)
  const list = await listArtworkImages(workspaceRoot)
  const found = list.find((a) => a.id === input.id)
  if (!found) throw new Error('Artwork file missing.')
  return found
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
  return listArtworkImages(workspaceRoot)
}
