import path from 'node:path'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { ipcMain } from 'electron'
import { BOOK_STORY_RELATIVE_PATH, ipcChannels } from '@emprint/shared'
import { ensureWorkspaceMounted, getMountedSiteProjectKind } from '../state'
import {
  applyPostPublishScopeChange,
  resolveSafeStoryPath,
  toPosixWorkspacePath
} from '../core'

export function registerStoryHandlers(): void {
  ipcMain.handle(ipcChannels.storyRead, async () => {
    if (getMountedSiteProjectKind() !== 'book') {
      throw new Error('Story is only available in Book workspaces.')
    }
    const root = ensureWorkspaceMounted()
    const abs = resolveSafeStoryPath(root, BOOK_STORY_RELATIVE_PATH)
    const content = await readFile(abs, 'utf8')
    return { path: BOOK_STORY_RELATIVE_PATH, content }
  })

  ipcMain.handle(ipcChannels.storySave, async (_event, input: { content: string }) => {
    if (getMountedSiteProjectKind() !== 'book') {
      throw new Error('Story is only available in Book workspaces.')
    }
    const root = ensureWorkspaceMounted()
    const abs = resolveSafeStoryPath(root, BOOK_STORY_RELATIVE_PATH)
    await mkdir(path.dirname(abs), { recursive: true })
    await writeFile(abs, input.content, 'utf8')
    await applyPostPublishScopeChange(root, BOOK_STORY_RELATIVE_PATH, input.content)
    return { path: BOOK_STORY_RELATIVE_PATH }
  })
}
