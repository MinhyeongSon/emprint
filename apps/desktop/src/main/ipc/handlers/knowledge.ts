import { ipcMain } from 'electron'
import { ipcChannels } from '@emprint/shared'
import { buildKnowledgeIndexTree, resolveSafeKnowledgePath, summarizeKnowledge } from '../core'
import { ensureWorkspaceMounted } from '../state'
import { invalidateKnowledgeSearchCache, searchKnowledge } from '../knowledge-search-core'
import { registerMarkdownContentHandlers } from './markdown-content-factory'

export function registerKnowledgeHandlers(): void {
  registerMarkdownContentHandlers({
    channels: {
      list: ipcChannels.knowledgeList,
      read: ipcChannels.knowledgeRead,
      save: ipcChannels.knowledgeSave,
      move: ipcChannels.knowledgeMove,
      delete: ipcChannels.knowledgeDelete,
      search: ipcChannels.knowledgeSearch
    },
    sections: ['knowledge', 'drafts'],
    resolveSafePath: resolveSafeKnowledgePath,
    summarize: summarizeKnowledge,
    invalidateSearch: invalidateKnowledgeSearchCache,
    search: (root, input) =>
      searchKnowledge(root, input as { section: 'knowledge' | 'drafts'; query: string; indexPrefix?: string; tag?: string })
  })

  ipcMain.handle(ipcChannels.knowledgeIndexTree, async () => {
    const root = ensureWorkspaceMounted()
    return await buildKnowledgeIndexTree(root)
  })
}
