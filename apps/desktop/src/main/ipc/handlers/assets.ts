import { ipcMain } from 'electron'
import { ipcChannels } from '@emprint/shared'
import { ensureWorkspaceMounted } from '../state'
import { deleteAssetImage, listAssetImages, saveAssetImage } from '../core'

export function registerAssetsHandlers(): void {
  ipcMain.handle(ipcChannels.assetsSaveImage, async (_event, input) => {
    const root = ensureWorkspaceMounted()
    return await saveAssetImage(root, input)
  })

  ipcMain.handle(ipcChannels.assetsListImages, async () => {
    const root = ensureWorkspaceMounted()
    return await listAssetImages(root)
  })

  ipcMain.handle(ipcChannels.assetsDeleteImage, async (_event, input: { path: string }) => {
    const root = ensureWorkspaceMounted()
    await deleteAssetImage(root, input.path)
  })
}
