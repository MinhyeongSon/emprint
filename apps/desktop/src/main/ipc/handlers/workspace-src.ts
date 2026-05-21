import path from 'node:path'
import { existsSync } from 'node:fs'
import { mkdir, readFile, rename as fsRename, rm, stat, writeFile } from 'node:fs/promises'
import { ipcMain } from 'electron'
import {
  assertContentLoaderBase,
  ipcChannels,
  isWorkspaceContentConfigPath,
  isWorkspaceProtectedDesignDir
} from '@emprint/shared'
import { resolveSafeDesignFilePath } from '../../workspace/design-paths'
import { syncWorkspaceThemeFromFile, THEME_JSON_RELATIVE_PATH } from '../../workspace/theme-sync'
import { listWorkspaceDesignTree } from '../../workspace/design-tree'
import { ensureWorkspaceMounted, getMountedSiteProjectKind } from '../state'
import { isValidSrcEntryName, toPosixWorkspacePath } from '../core'

export function registerWorkspaceSrcHandlers(): void {
  ipcMain.handle(ipcChannels.workspaceSrcListTree, async () => {
    const root = ensureWorkspaceMounted()
    return await listWorkspaceDesignTree(root, getMountedSiteProjectKind())
  })

  ipcMain.handle(ipcChannels.workspaceSrcRead, async (_event, input: { path: string }) => {
    const root = ensureWorkspaceMounted()
    const abs = resolveSafeDesignFilePath(root, input.path, getMountedSiteProjectKind())
    const st = await stat(abs)
    if (!st.isFile()) {
      throw new Error('Not a file.')
    }
    const content = await readFile(abs, 'utf8')
    return { path: toPosixWorkspacePath(path.relative(root, abs)), content }
  })

  ipcMain.handle(ipcChannels.workspaceSrcSave, async (_event, input: { path: string; content: string }) => {
    const root = ensureWorkspaceMounted()
    const abs = resolveSafeDesignFilePath(root, input.path, getMountedSiteProjectKind())
    const relative = toPosixWorkspacePath(path.relative(root, abs))
    if (isWorkspaceContentConfigPath(relative)) {
      assertContentLoaderBase(input.content, getMountedSiteProjectKind())
    }
    await mkdir(path.dirname(abs), { recursive: true })
    await writeFile(abs, input.content, 'utf8')
    if (relative === THEME_JSON_RELATIVE_PATH) {
      await syncWorkspaceThemeFromFile(root, getMountedSiteProjectKind())
    }
    return { path: relative }
  })

  ipcMain.handle(ipcChannels.workspaceSrcCreate, async (_event, input: { path: string; kind: 'file' | 'directory' }) => {
    const root = ensureWorkspaceMounted()
    if (input.kind !== 'file' && input.kind !== 'directory') {
      throw new Error('Invalid create kind.')
    }
    const abs = resolveSafeDesignFilePath(root, input.path, getMountedSiteProjectKind())
    const baseName = path.basename(abs)
    if (!isValidSrcEntryName(baseName)) {
      throw new Error('Invalid name. Avoid empty values, slashes, or names like "." and "..".')
    }
    if (existsSync(abs)) {
      throw new Error('A file or folder with this name already exists.')
    }

    if (input.kind === 'directory') {
      await mkdir(abs, { recursive: false })
    } else {
      await mkdir(path.dirname(abs), { recursive: true })
      await writeFile(abs, '', { encoding: 'utf8', flag: 'wx' })
    }
    return {
      path: toPosixWorkspacePath(path.relative(root, abs)),
      kind: input.kind
    }
  })

  ipcMain.handle(ipcChannels.workspaceSrcRename, async (_event, input: { path: string; newName: string }) => {
    const root = ensureWorkspaceMounted()
    const abs = resolveSafeDesignFilePath(root, input.path, getMountedSiteProjectKind())
    const relative = toPosixWorkspacePath(path.relative(root, abs))
    if (isWorkspaceProtectedDesignDir(relative)) {
      throw new Error('Cannot rename this folder.')
    }
    const newName = input.newName.trim()
    if (!isValidSrcEntryName(newName)) {
      throw new Error('Invalid name. Avoid empty values, slashes, or names like "." and "..".')
    }
    const nextAbs = path.join(path.dirname(abs), newName)
    if (path.resolve(nextAbs) === path.resolve(abs)) {
      return { path: toPosixWorkspacePath(path.relative(root, abs)) }
    }
    if (existsSync(nextAbs)) {
      throw new Error('A file or folder with this name already exists.')
    }
    const safeNext = resolveSafeDesignFilePath(
      root,
      toPosixWorkspacePath(path.relative(root, nextAbs)),
      getMountedSiteProjectKind()
    )
    await fsRename(abs, safeNext)
    return { path: toPosixWorkspacePath(path.relative(root, safeNext)) }
  })

  ipcMain.handle(ipcChannels.workspaceSrcDelete, async (_event, input: { path: string }) => {
    const root = ensureWorkspaceMounted()
    const abs = resolveSafeDesignFilePath(root, input.path, getMountedSiteProjectKind())
    const relative = toPosixWorkspacePath(path.relative(root, abs))
    if (isWorkspaceProtectedDesignDir(relative)) {
      throw new Error('Cannot delete this folder.')
    }
    await rm(abs, { recursive: true, force: false })
  })
}
