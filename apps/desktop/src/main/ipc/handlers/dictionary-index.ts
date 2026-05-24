import { ipcMain } from 'electron'
import { ipcChannels } from '@emprint/shared'
import { assertDictionaryWorkspace, ensureWorkspaceMounted } from '../state'
import {
  buildRegistryIndexTree,
  createIndexEntry,
  deleteIndexEntry,
  listIndexEntries,
  renameIndexEntry,
  resolveIndexCreatePath,
  updateIndexEntry
} from '../index-registry-core'

export function registerDictionaryIndexHandlers(): void {
  ipcMain.handle(ipcChannels.indexList, async () => {
    assertDictionaryWorkspace()
    const root = ensureWorkspaceMounted()
    return await listIndexEntries(root)
  })

  ipcMain.handle(ipcChannels.indexTree, async () => {
    assertDictionaryWorkspace()
    const root = ensureWorkspaceMounted()
    return await buildRegistryIndexTree(root)
  })

  ipcMain.handle(
    ipcChannels.indexCreate,
    async (
      _event,
      input: { parentPath?: string; segment?: string; path?: string; label?: string; description?: string }
    ) => {
      assertDictionaryWorkspace()
      const root = ensureWorkspaceMounted()
      const path = resolveIndexCreatePath(input)
      return await createIndexEntry(root, {
        path,
        ...(input.label !== undefined ? { label: input.label } : {}),
        ...(input.description !== undefined ? { description: input.description } : {})
      })
    }
  )

  ipcMain.handle(
    ipcChannels.indexUpdate,
    async (_event, input: { path: string; label?: string; description?: string }) => {
      assertDictionaryWorkspace()
      const root = ensureWorkspaceMounted()
      return await updateIndexEntry(root, input)
    }
  )

  ipcMain.handle(ipcChannels.indexDelete, async (_event, input: { path: string }) => {
    assertDictionaryWorkspace()
    const root = ensureWorkspaceMounted()
    await deleteIndexEntry(root, input)
    return { ok: true }
  })

  ipcMain.handle(ipcChannels.indexRename, async (_event, input: { from: string; to: string }) => {
    assertDictionaryWorkspace()
    const root = ensureWorkspaceMounted()
    await renameIndexEntry(root, input)
    return { ok: true }
  })
}
