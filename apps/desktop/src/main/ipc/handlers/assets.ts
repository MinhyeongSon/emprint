import { ipcMain } from 'electron'
import { ipcChannels } from '@emprint/shared'
import { ensureWorkspaceMounted } from '../state'
import {
  applyAssetCatalogPublishScope,
  deleteAssetImage,
  listAssetImages,
  saveAssetImage,
  syncWorkspacePublishScope
} from '../core'

export function registerAssetsHandlers(): void {
  ipcMain.handle(ipcChannels.assetsSaveImage, async (_event, input) => {
    const root = ensureWorkspaceMounted()
    const saved = await saveAssetImage(root, input)
    await applyAssetCatalogPublishScope(root)
    return saved
  })

  ipcMain.handle(ipcChannels.assetsListImages, async () => {
    const root = ensureWorkspaceMounted()
    return await listAssetImages(root)
  })

  ipcMain.handle(ipcChannels.assetsDeleteImage, async (_event, input: { path: string }) => {
    const root = ensureWorkspaceMounted()
    await deleteAssetImage(root, input.path)
    await applyAssetCatalogPublishScope(root)
    await syncWorkspacePublishScope(root)
  })
}
