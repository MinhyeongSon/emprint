import { existsSync } from 'node:fs'
import { readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import {
  WORKSPACE_DESIGN_TREE_ROOT_FILES,
  WORKSPACE_DESIGN_TREE_SKIP_NAMES,
  WORKSPACE_DESIGN_TREE_TOP_LEVEL_DIRS,
  isWorkspaceContentRelativePath,
  isWorkspaceDesignGeneratedPath,
  isWorkspaceDesignTreeHiddenPath,
  type SiteProjectKind,
  type WorkspaceSrcTreeNode
} from '@emprint/shared'

function toPosix(relativePath: string): string {
  return relativePath.split(path.sep).join('/')
}

function shouldSkipTreeEntry(relativePath: string, name: string, kind: SiteProjectKind): boolean {
  if (WORKSPACE_DESIGN_TREE_SKIP_NAMES.has(name)) return true
  if (isWorkspaceContentRelativePath(relativePath, kind)) return true
  if (isWorkspaceDesignGeneratedPath(relativePath)) return true
  if (isWorkspaceDesignTreeHiddenPath(relativePath)) return true
  return false
}

async function buildDesignTreeNode(
  absPath: string,
  relativePath: string,
  kind: SiteProjectKind
): Promise<WorkspaceSrcTreeNode> {
  const name = path.basename(absPath)
  const posixRel = toPosix(relativePath)
  const st = await stat(absPath)
  if (!st.isDirectory()) {
    return { name, path: posixRel, kind: 'file' }
  }

  const dirents = await readdir(absPath, { withFileTypes: true })
  const children: WorkspaceSrcTreeNode[] = []
  for (const ent of dirents) {
    const childRel = posixRel === '.' ? ent.name : `${posixRel}/${ent.name}`
    if (shouldSkipTreeEntry(childRel, ent.name, kind)) continue
    const childAbs = path.join(absPath, ent.name)
    children.push(await buildDesignTreeNode(childAbs, childRel, kind))
  }
  children.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1
    return a.name.localeCompare(b.name)
  })
  return { name, path: posixRel, kind: 'directory', children }
}

/** Virtual root (path `.`) listing site tooling + `src/`, hiding content folders. */
export async function listWorkspaceDesignTree(
  workspaceRoot: string,
  kind: SiteProjectKind = 'column'
): Promise<WorkspaceSrcTreeNode> {
  const children: WorkspaceSrcTreeNode[] = []

  for (const name of WORKSPACE_DESIGN_TREE_ROOT_FILES) {
    const abs = path.join(workspaceRoot, name)
    if (!existsSync(abs)) continue
    const st = await stat(abs).catch(() => null)
    if (!st?.isFile()) continue
    children.push({ name, path: name, kind: 'file' })
  }

  for (const dir of WORKSPACE_DESIGN_TREE_TOP_LEVEL_DIRS) {
    const abs = path.join(workspaceRoot, dir)
    if (existsSync(abs)) {
      children.push(await buildDesignTreeNode(abs, dir, kind))
    } else if (dir === 'src') {
      children.push({ name: 'src', path: 'src', kind: 'directory', children: [] })
    }
  }

  children.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'directory' ? 1 : -1
    return a.name.localeCompare(b.name)
  })

  return { name: 'site', path: '.', kind: 'directory', children }
}
