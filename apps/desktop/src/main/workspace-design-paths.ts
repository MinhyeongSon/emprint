import path from 'node:path'
import {
  hasPathTraversalSegment,
  isWorkspaceContentRelativePath,
  isWorkspaceDesignEditablePath,
  normalizeWorkspaceRelativePath,
  type SiteProjectKind
} from '@emprint/shared'

/** Resolve a workspace-relative path for Design → Code read/write (site files, not content roots). */
export function resolveSafeDesignFilePath(
  workspaceRoot: string,
  inputPath: string,
  kind: SiteProjectKind = 'column'
): string {
  const normalized = inputPath.replace(/\\/g, '/').replace(/^\/+/, '')
  if (!normalized || normalized === '.' || hasPathTraversalSegment(normalized)) {
    throw new Error('Invalid path.')
  }
  if (!isWorkspaceDesignEditablePath(normalized, kind)) {
    throw new Error('Path is outside the site design workspace.')
  }

  const abs = path.resolve(workspaceRoot, ...normalized.split('/'))
  const relToRoot = path.relative(workspaceRoot, abs)
  if (relToRoot.startsWith('..') || path.isAbsolute(relToRoot)) {
    throw new Error('Path escapes the workspace.')
  }
  const posixRel = relToRoot.split(path.sep).join('/')
  if (isWorkspaceContentRelativePath(posixRel, kind)) {
    throw new Error('Content folders are edited in the content surfaces, not Design code.')
  }
  if (!isWorkspaceDesignEditablePath(posixRel, kind)) {
    throw new Error('Path is outside the site design workspace.')
  }
  return abs
}

export function normalizeDesignInputPath(inputPath: string): string {
  return normalizeWorkspaceRelativePath(inputPath)
}
