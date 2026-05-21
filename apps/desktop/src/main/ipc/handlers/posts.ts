import { existsSync } from 'node:fs'
import path from 'node:path'
import { mkdir, readFile, rename as fsRename, stat, unlink, writeFile } from 'node:fs/promises'
import { ipcMain } from 'electron'
import { ipcChannels } from '@emprint/shared'
import { ensureWorkspaceMounted } from '../state'
import {
  resolveSafePostsOrDraftsPath,
  safeListDirectory,
  summarizeMarkdown,
  toPosixWorkspacePath
} from '../core'

export function registerPostsHandlers(): void {
  ipcMain.handle(ipcChannels.postsList, async (_event, input: { section: 'posts' | 'drafts' }) => {
    const root = ensureWorkspaceMounted()
    const directory = path.join(root, input.section)
    const entries = await safeListDirectory(directory)
    const markdownFiles = entries.filter((entry) => entry.toLowerCase().endsWith('.md'))

    const summaries = await Promise.all(
      markdownFiles.map(async (fileName) => {
        const relativePath = `${input.section}/${fileName}`
        const absolutePath = path.join(root, relativePath)
        const content = await readFile(absolutePath, 'utf8')
        const stats = await stat(absolutePath)
        return summarizeMarkdown(relativePath, content, stats.mtime.toISOString())
      })
    )

    return summaries.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
  })

  ipcMain.handle(ipcChannels.postRead, async (_event, input: { path: string }) => {
    const root = ensureWorkspaceMounted()
    const abs = resolveSafePostsOrDraftsPath(root, input.path)
    const st = await stat(abs).catch(() => null)
    if (!st?.isFile()) {
      throw new Error('File not found.')
    }
    if (!abs.toLowerCase().endsWith('.md')) {
      throw new Error('Only markdown files can be read here.')
    }
    const content = await readFile(abs, 'utf8')
    return { path: toPosixWorkspacePath(path.relative(root, abs)), content }
  })

  ipcMain.handle(ipcChannels.postSave, async (_event, input: { path: string; content: string }) => {
    const root = ensureWorkspaceMounted()
    const abs = resolveSafePostsOrDraftsPath(root, input.path)
    if (!abs.toLowerCase().endsWith('.md')) {
      throw new Error('Only markdown files can be saved here.')
    }
    await mkdir(path.dirname(abs), { recursive: true })
    await writeFile(abs, input.content, 'utf8')
    return { path: toPosixWorkspacePath(path.relative(root, abs)) }
  })

  ipcMain.handle(ipcChannels.postsMove, async (_event, input: { from: string; to: string }) => {
    const root = ensureWorkspaceMounted()
    const fromAbs = resolveSafePostsOrDraftsPath(root, input.from)
    const toAbs = resolveSafePostsOrDraftsPath(root, input.to)
    if (path.resolve(fromAbs) === path.resolve(toAbs)) {
      return { path: toPosixWorkspacePath(path.relative(root, fromAbs)) }
    }
    if (existsSync(toAbs)) {
      throw new Error('A file with this name already exists at the destination.')
    }
    await mkdir(path.dirname(toAbs), { recursive: true })
    await fsRename(fromAbs, toAbs)
    return { path: toPosixWorkspacePath(path.relative(root, toAbs)) }
  })

  ipcMain.handle(ipcChannels.postsDelete, async (_event, input: { path: string }) => {
    const root = ensureWorkspaceMounted()
    const abs = resolveSafePostsOrDraftsPath(root, input.path)
    const st = await stat(abs).catch(() => null)
    if (!st) {
      throw new Error('File not found.')
    }
    if (!st.isFile()) {
      throw new Error('Only individual files can be deleted from posts/ or drafts/.')
    }
    if (!abs.toLowerCase().endsWith('.md')) {
      throw new Error('Only markdown files can be deleted here.')
    }
    await unlink(abs)
    return { path: toPosixWorkspacePath(path.relative(root, abs)) }
  })
}
