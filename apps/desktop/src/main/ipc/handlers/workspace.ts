import path from 'node:path'
import { readFile } from 'node:fs/promises'
import { ipcMain } from 'electron'
import { ipcChannels, parseWorkspaceConfig, parseWorkspaceManifestJson } from '@emprint/shared'
import { MANIFEST_RELATIVE_PATH } from '@emprint/shared'
import { stopSiteDevServer } from '../../site-dev/server'
import type { IpcContext } from '../context'
import {
  clearMountedWorkspace,
  getMountedWorkspaceRoot,
  setMountedSiteProjectKind,
  setMountedWorkspaceRoot
} from '../state'
import { ensureEmprintGitignore, untrackEmprintIgnoredPaths } from '../core'

export function registerWorkspaceHandlers(ctx: IpcContext): void {
  ipcMain.handle(ipcChannels.workspaceInitialize, async (_event, payload: unknown) => {
    const config = parseWorkspaceConfig(payload)
    const initializedWorkspace = await ctx.bootstrapper.initialize(config)

    await ensureEmprintGitignore(initializedWorkspace.workspaceRoot)
    await untrackEmprintIgnoredPaths(initializedWorkspace.workspaceRoot)

    await stopSiteDevServer()
    setMountedWorkspaceRoot(initializedWorkspace.workspaceRoot)
    setMountedSiteProjectKind(
      initializedWorkspace.manifest.siteProjectKind ?? config.siteProjectKind ?? 'column'
    )

    return initializedWorkspace
  })

  ipcMain.handle(ipcChannels.workspaceOpen, async (_event, input: { localDirectory: string }) => {
    const workspaceRoot = path.resolve(input.localDirectory)
    const mounted = getMountedWorkspaceRoot()
    if (mounted && path.resolve(mounted) !== workspaceRoot) {
      await stopSiteDevServer()
    }
    const manifestPath = path.join(workspaceRoot, MANIFEST_RELATIVE_PATH)
    const manifestRaw = await readFile(manifestPath, 'utf8')
    const manifest = parseWorkspaceManifestJson(manifestRaw)
    if (!manifest) {
      throw new Error('Invalid workspace manifest.')
    }

    await ensureEmprintGitignore(workspaceRoot)
    await untrackEmprintIgnoredPaths(workspaceRoot)

    setMountedWorkspaceRoot(workspaceRoot)
    setMountedSiteProjectKind(manifest.siteProjectKind ?? 'column')

    return {
      workspaceRoot,
      createdFiles: [],
      manifest
    }
  })

  ipcMain.handle(ipcChannels.workspaceUnmount, async () => {
    await stopSiteDevServer()
    clearMountedWorkspace()
  })
}
