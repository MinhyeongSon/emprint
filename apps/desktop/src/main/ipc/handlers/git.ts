import { ipcMain } from 'electron'
import { ipcChannels } from '@emprint/shared'
import { ensureWorkspaceMounted } from '../state'
import {
  gitInitialSync,
  gitPull,
  gitPublish,
  gitLog,
  gitRollback,
  gitResetDraft,
  gitRecoverWorkspace,
  gitWorkingTree
} from '../core'

export function registerGitHandlers(): void {
  ipcMain.handle(ipcChannels.gitInitialSync, async (_event, input) => gitInitialSync(input))

  ipcMain.handle(ipcChannels.gitWorkingTree, async () => {
    const root = ensureWorkspaceMounted()
    return await gitWorkingTree(root)
  })

  ipcMain.handle(ipcChannels.gitPull, async (_event, input) => {
    const root = ensureWorkspaceMounted()
    return await gitPull(root, input)
  })

  ipcMain.handle(ipcChannels.gitRecoverWorkspace, async (event, input) => {
    return await gitRecoverWorkspace(event.sender, input)
  })

  ipcMain.handle(ipcChannels.gitPublish, async (_event, input) => {
    const root = ensureWorkspaceMounted()
    return await gitPublish(root, input)
  })

  ipcMain.handle(ipcChannels.gitLog, async (_event, input) => {
    const root = ensureWorkspaceMounted()
    return await gitLog(root, input ?? {})
  })

  ipcMain.handle(ipcChannels.gitRollback, async (_event, input) => {
    const root = ensureWorkspaceMounted()
    return await gitRollback(root, input)
  })

  ipcMain.handle(ipcChannels.gitResetDraft, async () => {
    const root = ensureWorkspaceMounted()
    return await gitResetDraft(root)
  })
}
