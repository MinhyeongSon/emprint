import {
  hasPathTraversalSegment,
  isWorkspaceDesignEditablePath,
  normalizeWorkspaceRelativePath,
  WORKSPACE_CONTENT_CONFIG_PATH
} from '@emprint/shared'

/** Paths passed to `workspaceSrc` IPC — site design files (root tooling + `src/`, not posts/). */

export const SITE_GLOBAL_CSS_PATH = 'src/styles/global.css'
export const THEME_JSON_PATH = 'config/theme.json'

export { WORKSPACE_CONTENT_CONFIG_PATH }

/** Normalize a workspace-relative design path (no forced `src/` prefix). */
export function normalizeWorkspaceDesignPath(inputPath: string): string {
  const normalized = inputPath.replace(/\\/g, '/').trim().replace(/^\/+/, '')
  if (!normalized || normalized === '.' || hasPathTraversalSegment(normalized)) {
    throw new Error('Invalid path.')
  }
  if (!isWorkspaceDesignEditablePath(normalized)) {
    throw new Error('Path is outside the site design workspace.')
  }
  return normalized
}

/** @deprecated Use `normalizeWorkspaceDesignPath`. Kept for call sites during migration. */
export function normalizeWorkspaceSrcPath(inputPath: string): string {
  return normalizeWorkspaceDesignPath(inputPath)
}
