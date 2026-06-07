import { ipcMain } from 'electron'
import { ipcChannels } from '@emprint/shared'
import { assertDictionaryWorkspace, ensureWorkspaceMounted } from '../state'
import {
  buildDictionaryContentsSnapshot,
  reparentIndexEntry
} from '../index-registry-core'
import { reassignKnowledgeEntryIndex } from '../knowledge-index-mutations'

export function registerDictionaryContentsHandlers(): void {
  ipcMain.handle(ipcChannels.dictionaryContentsSnapshot, async () => {
    assertDictionaryWorkspace()
    const root = ensureWorkspaceMounted()
    return await buildDictionaryContentsSnapshot(root)
  })

  ipcMain.handle(
    ipcChannels.dictionaryReparentIndex,
    async (_event, input: { from: string; toParentPath: string }) => {
      assertDictionaryWorkspace()
      const root = ensureWorkspaceMounted()
      await reparentIndexEntry(root, input)
      return { ok: true as const }
    }
  )

  ipcMain.handle(
    ipcChannels.dictionaryReassignEntryIndex,
    async (_event, input: { path: string; index: string }) => {
      assertDictionaryWorkspace()
      const root = ensureWorkspaceMounted()
      return await reassignKnowledgeEntryIndex(root, input)
    }
  )
}
