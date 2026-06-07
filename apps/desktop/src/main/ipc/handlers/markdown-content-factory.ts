import { existsSync } from 'node:fs'
import path from 'node:path'
import { mkdir, readFile, rename as fsRename, stat, unlink, writeFile } from 'node:fs/promises'
import { ipcMain } from 'electron'
import { ensureWorkspaceMounted } from '../state'
import { applyPostDeletePublishScope, applyPostPublishScopeChange, applyPostsMovePublishScope, syncWorkspacePublishScope, toPosixWorkspacePath } from '../core'
import { safeListDirectory } from '../../workspace/workspace-path'

type MarkdownSection = string

export type MarkdownContentChannels = {
  list: string
  read: string
  save: string
  move: string
  delete: string
  search: string
}

export function registerMarkdownContentHandlers<TSummary>(opts: {
  channels: MarkdownContentChannels
  sections: readonly MarkdownSection[]
  resolveSafePath: (root: string, inputPath: string) => string
  summarize: (relativePath: string, content: string, fallbackUpdatedAt: string) => TSummary
  invalidateSearch: () => void
  search: (root: string, input: { section: string; query: string; tag?: string; indexPrefix?: string }) => Promise<unknown>
  listInputKey?: string
}): void {
  const listSectionKey = opts.listInputKey ?? 'section'

  ipcMain.handle(opts.channels.list, async (_event, input: Record<string, string>) => {
    const root = ensureWorkspaceMounted()
    const section = input[listSectionKey] ?? ''
    if (!section || !opts.sections.includes(section)) {
      throw new Error('Invalid section.')
    }
    const directory = path.join(root, section)
    const entries = await safeListDirectory(directory)
    const markdownFiles = entries.filter((entry) => entry.toLowerCase().endsWith('.md'))

    const summaries = await Promise.all(
      markdownFiles.map(async (fileName) => {
        const relativePath = `${section}/${fileName}`
        const absolutePath = path.join(root, relativePath)
        const content = await readFile(absolutePath, 'utf8')
        const stats = await stat(absolutePath)
        return opts.summarize(relativePath, content, stats.mtime.toISOString())
      })
    )

    return summaries.sort((a, b) => {
      const left = (a as { updatedAt?: string }).updatedAt ?? ''
      const right = (b as { updatedAt?: string }).updatedAt ?? ''
      return left < right ? 1 : -1
    })
  })

  ipcMain.handle(opts.channels.read, async (_event, input: { path: string }) => {
    const root = ensureWorkspaceMounted()
    const abs = opts.resolveSafePath(root, input.path)
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

  ipcMain.handle(opts.channels.save, async (_event, input: { path: string; content: string }) => {
    const root = ensureWorkspaceMounted()
    const abs = opts.resolveSafePath(root, input.path)
    if (!abs.toLowerCase().endsWith('.md')) {
      throw new Error('Only markdown files can be saved here.')
    }
    await mkdir(path.dirname(abs), { recursive: true })
    await writeFile(abs, input.content, 'utf8')
    const rel = toPosixWorkspacePath(path.relative(root, abs))
    await applyPostPublishScopeChange(root, rel, input.content)
    opts.invalidateSearch()
    return { path: rel }
  })

  ipcMain.handle(opts.channels.move, async (_event, input: { from: string; to: string }) => {
    const root = ensureWorkspaceMounted()
    const fromAbs = opts.resolveSafePath(root, input.from)
    const toAbs = opts.resolveSafePath(root, input.to)
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
    opts.invalidateSearch()
    return { path: rel }
  })

  ipcMain.handle(opts.channels.delete, async (_event, input: { path: string }) => {
    const root = ensureWorkspaceMounted()
    const abs = opts.resolveSafePath(root, input.path)
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
    opts.invalidateSearch()
    return { path: rel }
  })

  ipcMain.handle(opts.channels.search, async (_event, input: { section: string; query: string; tag?: string; indexPrefix?: string }) => {
    const root = ensureWorkspaceMounted()
    return await opts.search(root, input)
  })
}
