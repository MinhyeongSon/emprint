import { ipcMain } from 'electron'
import { ipcChannels } from '@emprint/shared'
import {
  deleteArtworkImage,
  listArtworkImages,
  reorderArtworkImages,
  saveArtworkImage,
  updateArtworkImage
} from '../../workspace/artwork-io'
import { assertFragmentsWorkspace, ensureWorkspaceMounted } from '../state'

export function registerArtworkHandlers(): void {
  ipcMain.handle(ipcChannels.artworkList, async () => {
    assertFragmentsWorkspace()
    const root = ensureWorkspaceMounted()
    return await listArtworkImages(root)
  })

  ipcMain.handle(ipcChannels.artworkSave, async (_event, input) => {
    assertFragmentsWorkspace()
    const root = ensureWorkspaceMounted()
    return await saveArtworkImage(root, input)
  })

  ipcMain.handle(ipcChannels.artworkUpdate, async (_event, input) => {
    assertFragmentsWorkspace()
    const root = ensureWorkspaceMounted()
    return await updateArtworkImage(root, input)
  })

  ipcMain.handle(ipcChannels.artworkDelete, async (_event, input) => {
    assertFragmentsWorkspace()
    const root = ensureWorkspaceMounted()
    await deleteArtworkImage(root, input)
  })

  ipcMain.handle(ipcChannels.artworkReorder, async (_event, input) => {
    assertFragmentsWorkspace()
    const root = ensureWorkspaceMounted()
    return await reorderArtworkImages(root, input)
  })
}
