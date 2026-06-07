import { ipcChannels } from '@emprint/shared'
import {
  resolveSafePostsOrDraftsPath,
  summarizeMarkdown
} from '../core'
import { invalidatePostsSearchCache, searchPosts } from '../posts-search-core'
import { registerMarkdownContentHandlers } from './markdown-content-factory'

export function registerPostsHandlers(): void {
  registerMarkdownContentHandlers({
    channels: {
      list: ipcChannels.postsList,
      read: ipcChannels.postRead,
      save: ipcChannels.postSave,
      move: ipcChannels.postsMove,
      delete: ipcChannels.postsDelete,
      search: ipcChannels.postsSearch
    },
    sections: ['posts', 'drafts'],
    resolveSafePath: resolveSafePostsOrDraftsPath,
    summarize: summarizeMarkdown,
    invalidateSearch: invalidatePostsSearchCache,
    search: (root, input) => searchPosts(root, input as { section: 'posts' | 'drafts'; query: string; tag?: string })
  })
}
