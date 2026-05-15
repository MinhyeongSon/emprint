import { hasPathTraversalSegment } from '@emprint/shared'

/** Paths passed to `workspaceSrc` IPC must be relative to the workspace root and under `src/`. */

export const SITE_GLOBAL_CSS_PATH = 'src/styles/global.css'

export function normalizeWorkspaceSrcPath(inputPath: string): string {
  const normalized = inputPath.replace(/\\/g, '/').trim().replace(/^\/+/, '')
  if (!normalized || hasPathTraversalSegment(normalized)) {
    throw new Error('Invalid path.')
  }
  if (normalized === 'src' || normalized.startsWith('src/')) {
    return normalized
  }
  return `src/${normalized}`
}
