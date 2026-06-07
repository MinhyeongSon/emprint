import path from 'node:path'
import { readFileSync } from 'node:fs'
import {
  hasPathTraversalSegment,
  MANIFEST_RELATIVE_PATH,
  parseWorkspaceManifestJson,
  WORKSPACE_DIR,
  type AssetReference,
  type SiteProjectKind
} from '@emprint/shared'
import { workspaceRuntime } from '@emprint/core'

export function publishedMarkdownSection(kind: SiteProjectKind): 'posts' | 'knowledge' | 'story' {
  if (kind === 'dictionary') return 'knowledge'
  if (kind === 'book') return 'story'
  return 'posts'
}

export function contentSectionFromPath(relPath: string): AssetReference['section'] | null {
  if (relPath.startsWith(`${WORKSPACE_DIR.posts}/`)) return 'posts'
  if (relPath.startsWith(`${WORKSPACE_DIR.knowledge}/`)) return 'knowledge'
  if (relPath.startsWith(`${WORKSPACE_DIR.drafts}/`)) return 'drafts'
  if (relPath.startsWith(`${WORKSPACE_DIR.story}/`)) return 'story'
  return null
}

export function postSectionFromPath(postPath: string): 'posts' | 'drafts' | 'knowledge' | 'story' | null {
  return contentSectionFromPath(postPath)
}

export function resolveWorkspaceSiteProjectKind(workspaceRoot: string): SiteProjectKind {
  if (workspaceRuntime.mountedRoot && path.resolve(workspaceRuntime.mountedRoot) === path.resolve(workspaceRoot)) {
    return workspaceRuntime.siteProjectKind
  }
  const manifestPath = path.join(workspaceRoot, MANIFEST_RELATIVE_PATH)
  try {
    const raw = readFileSync(manifestPath, 'utf8')
    const manifest = parseWorkspaceManifestJson(raw)
    if (manifest?.siteProjectKind) return manifest.siteProjectKind
  } catch {
    // fall through
  }
  return 'column'
}

export function resolveSafeSectionsPath(workspaceRoot: string, inputPath: string): string {
  const normalized = inputPath.replace(/\\/g, '/').replace(/^\/+/, '')
  if (!normalized || hasPathTraversalSegment(normalized)) {
    throw new Error('Invalid path.')
  }
  if (!normalized.startsWith(`${WORKSPACE_DIR.sections}/`)) {
    throw new Error('Path must be under sections/.')
  }
  const abs = path.resolve(workspaceRoot, ...normalized.split('/'))
  const sectionsRoot = path.resolve(workspaceRoot, WORKSPACE_DIR.sections)
  const rel = path.relative(sectionsRoot, abs)
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error('Path escapes sections/.')
  }
  if (!abs.toLowerCase().endsWith('.json')) {
    throw new Error('Only JSON section files can be edited here.')
  }
  return abs
}

export function resolveSafeKnowledgeOrPostsPath(
  workspaceRoot: string,
  inputPath: string,
  kind: SiteProjectKind = resolveWorkspaceSiteProjectKind(workspaceRoot)
): string {
  const normalized = inputPath.replace(/\\/g, '/').replace(/^\/+/, '')
  if (!normalized || hasPathTraversalSegment(normalized)) {
    throw new Error('Invalid path.')
  }
  const publishedPrefix = `${publishedMarkdownSection(kind)}/`
  if (!normalized.startsWith(publishedPrefix) && !normalized.startsWith('drafts/')) {
    throw new Error(`Path must be under ${publishedPrefix} or drafts/.`)
  }
  const abs = path.resolve(workspaceRoot, ...normalized.split('/'))
  const publishedRoot = path.resolve(workspaceRoot, publishedMarkdownSection(kind))
  const draftsRoot = path.resolve(workspaceRoot, WORKSPACE_DIR.drafts)
  const inPublished =
    !path.relative(publishedRoot, abs).startsWith('..') &&
    !path.isAbsolute(path.relative(publishedRoot, abs))
  const inDrafts =
    !path.relative(draftsRoot, abs).startsWith('..') && !path.isAbsolute(path.relative(draftsRoot, abs))
  if (!inPublished && !inDrafts) {
    throw new Error('Path escapes allowed content folders.')
  }
  return abs
}

export function resolveSafePostsOrDraftsPath(workspaceRoot: string, inputPath: string): string {
  return resolveSafeKnowledgeOrPostsPath(workspaceRoot, inputPath, 'column')
}

export function resolveSafeKnowledgePath(workspaceRoot: string, inputPath: string): string {
  return resolveSafeKnowledgeOrPostsPath(workspaceRoot, inputPath, 'dictionary')
}

/** Book — only `story/story.md`. */
export function resolveSafeStoryPath(workspaceRoot: string, inputPath: string): string {
  const normalized = inputPath.replace(/\\/g, '/').replace(/^\/+/, '')
  if (normalized !== 'story/story.md') {
    throw new Error('Book workspaces only support story/story.md.')
  }
  const abs = path.resolve(workspaceRoot, ...normalized.split('/'))
  const storyRoot = path.resolve(workspaceRoot, WORKSPACE_DIR.story)
  if (path.relative(storyRoot, abs).startsWith('..') || path.isAbsolute(path.relative(storyRoot, abs))) {
    throw new Error('Path escapes allowed content folders.')
  }
  return abs
}

export function resolveSafeAssetPath(workspaceRoot: string, inputPath: string): string {
  const normalized = inputPath.replace(/\\/g, '/').replace(/^\/+/, '')
  if (!normalized || hasPathTraversalSegment(normalized)) {
    throw new Error('Invalid asset path.')
  }
  if (!normalized.startsWith(`${WORKSPACE_DIR.assets}/`)) {
    throw new Error('Asset path must start with assets/.')
  }
  const abs = path.resolve(workspaceRoot, ...normalized.split('/'))
  const assetsRoot = path.resolve(workspaceRoot, WORKSPACE_DIR.assets)
  const rel = path.relative(assetsRoot, abs)
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error('Path escapes assets/.')
  }
  return abs
}
