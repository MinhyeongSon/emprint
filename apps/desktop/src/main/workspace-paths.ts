/**
 * Single source of truth for the workspace directory layout. Importing these
 * constants instead of inlining string literals prevents typos and makes the
 * relationship between the bootstrapper and the IPC layer explicit.
 *
 * **Content** (author in Posts/Drafts/Assets): `posts/`, `drafts/`, `assets/`
 * **Design** (author in Design → Code/Template): `src/` and site tooling at repo root
 *
 * All values are POSIX path segments / fragments relative to the workspace
 * root. Use `path.join(workspaceRoot, WORKSPACE_DIR.posts)` rather than
 * concatenating manually so platform-specific separators stay correct.
 */
export const WORKSPACE_DIR = {
  posts: 'posts',
  drafts: 'drafts',
  sections: 'sections',
  assets: 'assets',
  /** Where uploaded image binaries live (under `assets/`). */
  assetsImages: 'assets/images',
  /** Emprint-internal cache + manifest folder. */
  workspace: '.workspace',
  config: 'config'
} as const

/** Path of the workspace manifest relative to the workspace root. */
export const MANIFEST_RELATIVE_PATH = `${WORKSPACE_DIR.workspace}/manifest.json`

import type { SiteProjectKind } from '@emprint/shared'
import { getAnthologyContentLayout } from '@emprint/shared'

/** Directories the bootstrapper guarantees to create on initialize. */
export function getRequiredWorkspaceDirectories(kind: SiteProjectKind): string[] {
  const layout = getAnthologyContentLayout(kind)
  return [...layout.contentTopLevelDirs.filter((d) => d !== '.workspace'), WORKSPACE_DIR.config, WORKSPACE_DIR.workspace]
}

/** @deprecated Use `getRequiredWorkspaceDirectories('column')` */
export const REQUIRED_WORKSPACE_DIRECTORIES = getRequiredWorkspaceDirectories('column')
