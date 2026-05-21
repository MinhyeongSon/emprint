import { getAnthologyContentLayout, type AnthologyKind } from '../anthology/types'
import { hasPathTraversalSegment } from './path-safety'
import type { AppLocale, SiteProjectKind } from '../types'

/**
 * Workspace on-disk layout — anthology-aware content roots + shared design tree.
 *
 * - **Column content**: `posts/`, `drafts/`, `assets/`
 * - **Memoir content**: `sections/`, `assets/` (no post timeline folders)
 * - **Design** (all kinds): `src/`, `config/`, site tooling at repo root
 */

export const WORKSPACE_CONTENT_CONFIG_PATH = 'src/content.config.ts'

/** @deprecated Prefer `getAnthologyContentLayout('column').contentLoaderBase` */
export const POSTS_CONTENT_LOADER_BASE = './posts'

export function getWorkspaceContentTopLevelDirs(kind: SiteProjectKind): Set<string> {
  return new Set(getAnthologyContentLayout(kind).contentTopLevelDirs)
}

/** Column default — used where anthology kind is not yet threaded. */
export const WORKSPACE_CONTENT_TOP_LEVEL_DIRS = getWorkspaceContentTopLevelDirs('column')

export function isWorkspaceContentConfigPath(relativePath: string): boolean {
  return relativePath.replace(/\\/g, '/').trim() === WORKSPACE_CONTENT_CONFIG_PATH
}

/** Column: folder-based draft flag. Memoir: always false (use `published` in section JSON). */
export function draftFlagFromRelativePath(relativePath: string, kind: SiteProjectKind = 'column'): boolean {
  const normalized = relativePath.replace(/\\/g, '/')
  if (kind === 'memoir') return false
  if (normalized.startsWith('drafts/')) return true
  if (normalized.startsWith('posts/')) return false
  return false
}

export const WORKSPACE_DESIGN_ROOT_FILE_ORDER = [
  'package.json',
  'package-lock.json',
  'astro.config.mjs',
  'tsconfig.json',
  'README.md',
  '.gitignore'
] as const

export const WORKSPACE_DESIGN_ROOT_FILES = new Set<string>(WORKSPACE_DESIGN_ROOT_FILE_ORDER)

export const WORKSPACE_DESIGN_TREE_ROOT_FILES = [
  'package.json',
  'README.md',
  'astro.config.mjs',
  'tsconfig.json'
] as const

export const WORKSPACE_DESIGN_TOP_LEVEL_DIRS = ['config', 'scripts', 'public', 'src', '.github'] as const

export const WORKSPACE_DESIGN_TREE_TOP_LEVEL_DIRS = ['config', 'src'] as const

const WORKSPACE_DESIGN_TREE_HIDDEN_PATHS = new Set([
  'package-lock.json',
  '.gitignore',
  'src/content.config.ts',
  'src/env.d.ts',
  'src/lib',
  'src/lib/site.ts'
])

const WORKSPACE_DESIGN_TREE_HIDDEN_PREFIXES = [
  'scripts/',
  'public/',
  '.github/',
  'src/lib/'
] as const

const WORKSPACE_DESIGN_TREE_CONFIG_VISIBLE = new Set(['config/site.json', 'config/theme.json'])

export const WORKSPACE_DESIGN_TREE_SKIP_NAMES = new Set([
  'node_modules',
  '.git',
  'dist',
  '.astro',
  '.DS_Store'
])

export const WORKSPACE_PROTECTED_DESIGN_DIRS = new Set(['.', 'src', 'config'])

export function isWorkspaceDesignTreeHiddenPath(relativePath: string): boolean {
  const normalized = relativePath.replace(/\\/g, '/').replace(/^\/+/, '')
  if (!normalized || normalized === '.') return false
  if (WORKSPACE_DESIGN_TREE_HIDDEN_PATHS.has(normalized)) return true
  if (normalized.startsWith('config/') && !WORKSPACE_DESIGN_TREE_CONFIG_VISIBLE.has(normalized)) {
    return true
  }
  for (const prefix of WORKSPACE_DESIGN_TREE_HIDDEN_PREFIXES) {
    if (normalized === prefix.slice(0, -1) || normalized.startsWith(prefix)) {
      return true
    }
  }
  return false
}

export function normalizeWorkspaceRelativePath(inputPath: string): string {
  const normalized = inputPath.replace(/\\/g, '/').trim().replace(/^\/+/, '')
  if (!normalized || normalized === '.') {
    throw new Error('Invalid path.')
  }
  if (hasPathTraversalSegment(normalized)) {
    throw new Error('Invalid path.')
  }
  return normalized
}

export function isWorkspaceContentRelativePath(
  relativePath: string,
  kind: SiteProjectKind = 'column'
): boolean {
  const normalized = relativePath.replace(/\\/g, '/').replace(/^\/+/, '')
  if (!normalized || normalized === '.') return false
  const top = normalized.split('/')[0] ?? ''
  return getWorkspaceContentTopLevelDirs(kind).has(top)
}

export function isWorkspaceDesignGeneratedPath(relativePath: string): boolean {
  const normalized = relativePath.replace(/\\/g, '/').replace(/^\/+/, '')
  return normalized === 'public/assets' || normalized.startsWith('public/assets/')
}

export function isWorkspaceDesignEditablePath(
  relativePath: string,
  kind: SiteProjectKind = 'column'
): boolean {
  const normalized = relativePath.replace(/\\/g, '/').replace(/^\/+/, '')
  if (!normalized || normalized === '.') return false
  if (isWorkspaceContentRelativePath(normalized, kind)) return false
  if (isWorkspaceDesignGeneratedPath(normalized)) return false
  if (normalized === 'src' || normalized.startsWith('src/')) return true
  if (WORKSPACE_DESIGN_ROOT_FILES.has(normalized)) return true
  for (const dir of WORKSPACE_DESIGN_TOP_LEVEL_DIRS) {
    if (normalized === dir || normalized.startsWith(`${dir}/`)) {
      return true
    }
  }
  return false
}

export function isWorkspaceDesignTreeRootPath(relativePath: string): boolean {
  return relativePath.replace(/\\/g, '/').replace(/^\/+/, '') === '.'
}

export function isWorkspaceProtectedDesignDir(relativePath: string): boolean {
  const normalized = relativePath.replace(/\\/g, '/').replace(/^\/+/, '')
  return WORKSPACE_PROTECTED_DESIGN_DIRS.has(normalized)
}

export function canCreateUnderDesignParent(parentPath: string, kind: SiteProjectKind = 'column'): boolean {
  const normalized = parentPath.replace(/\\/g, '/').replace(/^\/+/, '')
  if (!normalized || normalized === '.' || WORKSPACE_DESIGN_ROOT_FILES.has(normalized)) {
    return false
  }
  if (isWorkspaceDesignGeneratedPath(normalized)) return false
  return isWorkspaceDesignEditablePath(normalized, kind)
}

export function assertContentLoaderBase(
  content: string,
  kind: SiteProjectKind,
  locale: AppLocale = 'en'
): void {
  const layout = getAnthologyContentLayout(kind)
  const base = layout.contentLoaderBase.replace(/'/g, "\\'")
  const pattern = new RegExp(`base:\\s*['"]${layout.contentLoaderBase.replace(/\./g, '\\.')}['"]`)
  const patternSlash = new RegExp(
    `base:\\s*['"]${layout.contentLoaderBase.replace(/\./g, '\\.')}/['"]`
  )

  if (!pattern.test(content) && !patternSlash.test(content)) {
    throw new Error(
      locale === 'ko'
        ? `src/content.config.ts는 반드시 ${layout.contentLoaderBase} 에서만 콘텐츠를 불러와야 합니다.`
        : `src/content.config.ts must load content from ${layout.contentLoaderBase} only.`
    )
  }

  const forbidden =
    kind === 'column'
      ? [/base:\s*['"]\.\/drafts/, /base:\s*['"]\.\/src/]
      : [/base:\s*['"]\.\/posts/, /base:\s*['"]\.\/drafts/, /base:\s*['"]\.\/src/]

  for (const re of forbidden) {
    if (re.test(content)) {
      throw new Error(
        locale === 'ko'
          ? '콘텐츠 로더가 허용되지 않은 경로를 가리킬 수 없습니다.'
          : 'The content loader cannot target a forbidden content path.'
      )
    }
  }
}

/** @deprecated Use `assertContentLoaderBase(content, 'column', locale)` */
export function assertPostsContentLoaderBase(content: string, locale: AppLocale = 'en'): void {
  assertContentLoaderBase(content, 'column', locale)
}

export function anthologyKindFromManifest(manifest?: { siteProjectKind?: SiteProjectKind }): AnthologyKind {
  return manifest?.siteProjectKind ?? 'column'
}

/** On-disk content roots relative to the workspace folder (bootstrap + IPC). */
export const WORKSPACE_DIR = {
  posts: 'posts',
  drafts: 'drafts',
  sections: 'sections',
  assets: 'assets',
  assetsImages: 'assets/images',
  workspace: '.workspace',
  config: 'config'
} as const

export const MANIFEST_RELATIVE_PATH = `${WORKSPACE_DIR.workspace}/manifest.json`

/** Directories the bootstrapper creates on initialize. */
export function getRequiredWorkspaceDirectories(kind: SiteProjectKind): string[] {
  const layout = getAnthologyContentLayout(kind)
  return [...layout.contentTopLevelDirs.filter((d) => d !== '.workspace'), WORKSPACE_DIR.config, WORKSPACE_DIR.workspace]
}

/** @deprecated Use `getRequiredWorkspaceDirectories('column')` */
export const REQUIRED_WORKSPACE_DIRECTORIES = getRequiredWorkspaceDirectories('column')
