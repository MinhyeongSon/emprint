import { existsSync } from 'node:fs'
import path from 'node:path'
import { mkdir, readFile, rename as fsRename, stat, unlink, writeFile } from 'node:fs/promises'
import { ipcMain } from 'electron'
import { ipcChannels } from '@emprint/shared'
import { ensureWorkspaceMounted } from '../state'
import {
  applyPostDeletePublishScope,
  applyPostPublishScopeChange,
  applyPostsMovePublishScope,
  buildKnowledgeIndexTree,
  resolveSafeKnowledgePath,
  safeListDirectory,
  summarizeKnowledge,
  syncWorkspacePublishScope,
  toPosixWorkspacePath
} from '../core'

export function registerKnowledgeHandlers(): void {
  ipcMain.handle(ipcChannels.knowledgeList, async (_event, input: { section: 'knowledge' | 'drafts' }) => {
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
        return summarizeKnowledge(relativePath, content, stats.mtime.toISOString())
      })
    )

    return summaries.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
  })

  ipcMain.handle(ipcChannels.knowledgeRead, async (_event, input: { path: string }) => {
    const root = ensureWorkspaceMounted()
    const abs = resolveSafeKnowledgePath(root, input.path)
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

  ipcMain.handle(ipcChannels.knowledgeSave, async (_event, input: { path: string; content: string }) => {
    const root = ensureWorkspaceMounted()
    const abs = resolveSafeKnowledgePath(root, input.path)
    if (!abs.toLowerCase().endsWith('.md')) {
      throw new Error('Only markdown files can be saved here.')
    }
    await mkdir(path.dirname(abs), { recursive: true })
    await writeFile(abs, input.content, 'utf8')
    const rel = toPosixWorkspacePath(path.relative(root, abs))
    await applyPostPublishScopeChange(root, rel, input.content)
    return { path: rel }
  })

  ipcMain.handle(ipcChannels.knowledgeMove, async (_event, input: { from: string; to: string }) => {
    const root = ensureWorkspaceMounted()
    const fromAbs = resolveSafeKnowledgePath(root, input.from)
    const toAbs = resolveSafeKnowledgePath(root, input.to)
    if (path.resolve(fromAbs) === path.resolve(toAbs)) {
      return { path: toPosixWorkspacePath(path.relative(root, fromAbs)) }
    }
    if (existsSync(toAbs)) {
      throw new Error('A file with this name already exists at the destination.')
    }
    await mkdir(path.dirname(toAbs), { recursive: true })
    await fsRename(fromAbs, toAbs)
    const rel = toPosixWorkspacePath(path.relative(root, toAbs))
    await applyPostsMovePublishScope(root, input.from, rel)
    await syncWorkspacePublishScope(root)
    return { path: rel }
  })

  ipcMain.handle(ipcChannels.knowledgeDelete, async (_event, input: { path: string }) => {
    const root = ensureWorkspaceMounted()
    const abs = resolveSafeKnowledgePath(root, input.path)
    const st = await stat(abs).catch(() => null)
    if (!st) {
      throw new Error('File not found.')
    }
    if (!st.isFile()) {
      throw new Error('Only individual files can be deleted.')
    }
    if (!abs.toLowerCase().endsWith('.md')) {
      throw new Error('Only markdown files can be deleted here.')
    }
    const rel = toPosixWorkspacePath(path.relative(root, abs))
    await unlink(abs)
    await applyPostDeletePublishScope(root, rel)
    await syncWorkspacePublishScope(root)
    return { path: rel }
  })

  ipcMain.handle(ipcChannels.knowledgeIndexTree, async () => {
    const root = ensureWorkspaceMounted()
    return await buildKnowledgeIndexTree(root)
  })
}
