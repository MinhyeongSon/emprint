import type { SiteProjectKind } from '@emprint/shared'
import { workspaceRuntime } from '@emprint/core'

export function getMountedSiteProjectKind(): SiteProjectKind {
  return workspaceRuntime.siteProjectKind
}

export function setMountedSiteProjectKind(kind: SiteProjectKind): void {
  const root = workspaceRuntime.mountedRoot
  if (root) {
    workspaceRuntime.mount(root, kind)
  }
}

export function assertColumnWorkspace(): void {
  workspaceRuntime.assertColumn()
}

export function assertMemoirWorkspace(): void {
  workspaceRuntime.assertMemoir()
}

export function getMountedWorkspaceRoot(): string | null {
  return workspaceRuntime.mountedRoot
}

export function setMountedWorkspaceRoot(root: string | null): void {
  if (root === null) {
    workspaceRuntime.unmount()
    return
  }
  workspaceRuntime.mount(root, workspaceRuntime.siteProjectKind)
}

export function clearMountedWorkspace(): void {
  workspaceRuntime.unmount()
}

export function ensureWorkspaceMounted(): string {
  return workspaceRuntime.requireMounted()
}
