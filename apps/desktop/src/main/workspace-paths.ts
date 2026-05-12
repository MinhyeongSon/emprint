/**
 * Single source of truth for the workspace directory layout. Importing these
 * constants instead of inlining string literals prevents typos and makes the
 * relationship between the bootstrapper and the IPC layer explicit.
 *
 * All values are POSIX path segments / fragments relative to the workspace
 * root. Use `path.join(workspaceRoot, WORKSPACE_DIR.posts)` rather than
 * concatenating manually so platform-specific separators stay correct.
 */
export const WORKSPACE_DIR = {
  posts: 'posts',
  drafts: 'drafts',
  assets: 'assets',
  /** Where uploaded image binaries live (under `assets/`). */
  assetsImages: 'assets/images',
  /** Emprint-internal cache + manifest folder. */
  workspace: '.workspace',
  config: 'config'
} as const

/** Path of the workspace manifest relative to the workspace root. */
export const MANIFEST_RELATIVE_PATH = `${WORKSPACE_DIR.workspace}/manifest.json`

/** Directories the bootstrapper guarantees to create on initialize/open. */
export const REQUIRED_WORKSPACE_DIRECTORIES = [
  WORKSPACE_DIR.posts,
  WORKSPACE_DIR.drafts,
  WORKSPACE_DIR.assets,
  WORKSPACE_DIR.workspace,
  WORKSPACE_DIR.config
] as const
