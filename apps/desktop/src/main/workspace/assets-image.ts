import { existsSync } from 'node:fs'
import path from 'node:path'
import { mkdir, readFile, readdir, stat, unlink, writeFile } from 'node:fs/promises'
import {
  MAX_ASSET_IMAGE_BYTES,
  WORKSPACE_DIR,
  classifyAssetPublishScope,
  type AssetImageInfo,
  type AssetReference
} from '@emprint/shared'
import { parseKnowledgeSummary } from '@emprint/core'
import { summarizeMarkdown } from '../ipc/markdown-summary'
import { safeListDirectory, toPosixWorkspacePath } from './workspace-path'
import { publishedMarkdownSection, resolveSafeAssetPath, resolveWorkspaceSiteProjectKind } from './path-safety'

export const ASSET_IMAGE_MIME_ALLOWLIST: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg'
}

export function slugifyAssetBaseName(fileName: string): string {
  const withoutExt = fileName.replace(/\.[a-z0-9]+$/i, '')
  const slug = withoutExt
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
  return slug || 'image'
}

export function buildUniqueAssetPath(imagesDir: string, baseName: string, ext: string): string {
  let candidate = path.join(imagesDir, `${baseName}.${ext}`)
  let counter = 2
  while (existsSync(candidate)) {
    candidate = path.join(imagesDir, `${baseName}-${counter}.${ext}`)
    counter++
  }
  return candidate
}

export async function saveAssetImage(
  workspaceRoot: string,
  input: { fileName: string; data: Uint8Array; mimeType: string }
): Promise<AssetImageInfo> {
  const ext = ASSET_IMAGE_MIME_ALLOWLIST[input.mimeType]
  if (!ext) {
    throw new Error(`Unsupported image type: ${input.mimeType}`)
  }
  const data = input.data instanceof Uint8Array ? input.data : new Uint8Array(input.data as unknown as ArrayBuffer)
  if (data.byteLength > MAX_ASSET_IMAGE_BYTES) {
    throw new Error(
      `Image exceeds the 20MB upload limit (${(data.byteLength / (1024 * 1024)).toFixed(1)}MB). Reduce the size and try again.`
    )
  }
  if (data.byteLength === 0) {
    throw new Error('Empty image data.')
  }

  const baseName = slugifyAssetBaseName(input.fileName)
  const imagesDir = path.join(workspaceRoot, WORKSPACE_DIR.assetsImages)
  await mkdir(imagesDir, { recursive: true })
  const absPath = buildUniqueAssetPath(imagesDir, baseName, ext)
  await writeFile(absPath, data, { flag: 'wx' })

  const st = await stat(absPath)
  const relPath = toPosixWorkspacePath(path.relative(workspaceRoot, absPath))
  return {
    path: relPath,
    name: path.basename(absPath),
    size: st.size,
    mimeType: input.mimeType,
    modifiedAt: st.mtime.toISOString(),
    references: [],
    publishScope: 'orphan'
  }
}

export async function deleteAssetImage(workspaceRoot: string, relativePath: string): Promise<void> {
  const abs = resolveSafeAssetPath(workspaceRoot, relativePath)
  const st = await stat(abs)
  if (!st.isFile()) {
    throw new Error('Not a file.')
  }
  await unlink(abs)
}

export function mimeTypeForExtension(ext: string): string {
  switch (ext.toLowerCase()) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'png':
      return 'image/png'
    case 'webp':
      return 'image/webp'
    case 'gif':
      return 'image/gif'
    case 'svg':
      return 'image/svg+xml'
    default:
      return 'application/octet-stream'
  }
}

const MARKDOWN_IMAGE_RE = /!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g
const HTML_IMG_SRC_RE = /<img[^>]+src\s*=\s*["']([^"']+)["'][^>]*>/gi

export function normalizeReferenceTarget(reference: string): string | null {
  try {
    if (/^[a-z][a-z0-9+.-]*:/i.test(reference)) {
      if (reference.startsWith('emprint-asset://')) {
        return reference.replace(/^emprint-asset:\/\//i, '').replace(/^\/+/, '')
      }
      return null
    }
  } catch {
    return null
  }
  const clean = reference.split('#')[0]!.split('?')[0]!.trim()
  if (!clean) return null
  return clean.replace(/^\.\//, '').replace(/^\/+/, '')
}

export function* extractMarkdownImageRefs(markdown: string): Generator<string> {
  for (const m of markdown.matchAll(MARKDOWN_IMAGE_RE)) {
    if (m[1]) yield m[1]
  }
  for (const m of markdown.matchAll(HTML_IMG_SRC_RE)) {
    if (m[1]) yield m[1]
  }
}

export async function listAssetImages(workspaceRoot: string): Promise<AssetImageInfo[]> {
  const imagesDir = path.join(workspaceRoot, WORKSPACE_DIR.assetsImages)
  if (!existsSync(imagesDir)) {
    return []
  }

  const dirents = await readdir(imagesDir, { withFileTypes: true })
  const images: AssetImageInfo[] = []
  for (const ent of dirents) {
    if (!ent.isFile()) continue
    const ext = ent.name.split('.').pop()?.toLowerCase() ?? ''
    if (!Object.values(ASSET_IMAGE_MIME_ALLOWLIST).includes(ext)) continue
    const abs = path.join(imagesDir, ent.name)
    const st = await stat(abs)
    images.push({
      path: toPosixWorkspacePath(path.relative(workspaceRoot, abs)),
      name: ent.name,
      size: st.size,
      mimeType: mimeTypeForExtension(ext),
      modifiedAt: st.mtime.toISOString(),
      references: [],
      publishScope: 'orphan'
    })
  }

  const imageByKey = new Map<string, AssetImageInfo>()
  for (const img of images) {
    imageByKey.set(img.path, img)
    imageByKey.set(img.name, img)
  }

  const kind = resolveWorkspaceSiteProjectKind(workspaceRoot)
  const published = publishedMarkdownSection(kind)
  const sections: Array<{ section: AssetReference['section']; dir: string }> = [
    { section: published, dir: path.join(workspaceRoot, published) },
    { section: 'drafts', dir: path.join(workspaceRoot, WORKSPACE_DIR.drafts) }
  ]

  for (const { section, dir } of sections) {
    if (!existsSync(dir)) continue
    const files = await safeListDirectory(dir)
    for (const fileName of files) {
      if (!fileName.toLowerCase().endsWith('.md')) continue
      const postRelPath = `${section}/${fileName}`
      const absPostPath = path.join(dir, fileName)
      let content: string
      try {
        content = await readFile(absPostPath, 'utf8')
      } catch {
        continue
      }
      const title =
        section === 'knowledge'
          ? parseKnowledgeSummary(postRelPath, content).title
          : summarizeMarkdown(postRelPath, content, '').title
      for (const ref of extractMarkdownImageRefs(content)) {
        const target = normalizeReferenceTarget(ref)
        if (!target) continue
        const hit = imageByKey.get(target) ?? imageByKey.get(target.split('/').pop()!)
        if (!hit) continue
        if (hit.references.some((r) => r.postPath === postRelPath)) continue
        const reference: AssetReference = {
          postPath: postRelPath,
          postTitle: title,
          section
        }
        hit.references.push(reference)
      }
    }
  }

  for (const image of images) {
    image.publishScope = classifyAssetPublishScope(image.references)
  }

  images.sort((a, b) => (a.modifiedAt < b.modifiedAt ? 1 : -1))
  return images
}
