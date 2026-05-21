import { app, dialog, ipcMain } from 'electron'
import { ipcChannels } from '@emprint/shared'
import { qaWorkspaceRootOverride } from '../../qa/hooks'
import {
  getSiteDevServerState,
  installSiteDependencies,
  openSiteDevPreview,
  stopSiteDevServer
} from '../../site-dev/server'
import { detectNodeToolchain, resetNodeToolchainCache } from '../../site-dev/node-toolchain'
import { resolveWorkspaceMonacoTypescript } from '../../workspace/monaco-ts'
import { ensureWorkspaceMounted } from '../state'
import { gitDetect } from '../core'

export function registerSystemHandlers(): void {
  ipcMain.handle(ipcChannels.systemGetRuntimeInfo, async () => ({
    appName: app.getName(),
    appVersion: app.getVersion(),
    platform: process.platform,
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node
  }))

  ipcMain.handle(ipcChannels.systemSelectDirectory, async () => {
    const qaRoot = qaWorkspaceRootOverride()
    if (qaRoot) {
      return { directory: qaRoot }
    }

    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory']
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    return {
      directory: result.filePaths[0]
    }
  })

  ipcMain.handle(ipcChannels.nodeDetect, async () => {
    resetNodeToolchainCache()
    return await detectNodeToolchain()
  })

  ipcMain.handle(ipcChannels.gitDetect, async () => gitDetect())
}

export function registerSiteDevHandlers(): void {
  ipcMain.handle(ipcChannels.siteDevStop, async () => stopSiteDevServer())

  ipcMain.handle(ipcChannels.siteDevStatus, async () => getSiteDevServerState())

  ipcMain.handle(ipcChannels.siteDevOpenPreview, async () => {
    const root = ensureWorkspaceMounted()
    return openSiteDevPreview(root)
  })

  ipcMain.handle(ipcChannels.siteDevInstallDependencies, async () => {
    const root = ensureWorkspaceMounted()
    await installSiteDependencies(root)
  })

  ipcMain.handle(ipcChannels.workspaceMonacoTypescript, async () => {
    const root = ensureWorkspaceMounted()
    return resolveWorkspaceMonacoTypescript(root)
  })
}
