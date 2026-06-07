import path from 'node:path'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { ipcMain } from 'electron'
import { ipcChannels, parseMemoirSectionFile } from '@emprint/shared'
import {
  createMemoirSectionFile,
  deleteMemoirSectionWithCleanup,
  duplicateMemoirSection,
  listMemoirSectionSummaries,
  loadAllMemoirSectionFiles,
  reorderMemoirContainerChildren,
  reparentMemoirSection,
  writeMemoirSectionFile
} from '../../workspace/memoir-sections-io'
import { assertMemoirWorkspace, ensureWorkspaceMounted } from '../state'
import { resolveSafeSectionsPath, toPosixWorkspacePath } from '../core'

export function registerSectionsHandlers(): void {
  ipcMain.handle(ipcChannels.sectionsList, async () => {
    const root = ensureWorkspaceMounted()
    assertMemoirWorkspace()
    return listMemoirSectionSummaries(root)
  })

  ipcMain.handle(ipcChannels.sectionRead, async (_event, input: { path: string }) => {
    const root = ensureWorkspaceMounted()
    assertMemoirWorkspace()
    const abs = resolveSafeSectionsPath(root, input.path)
    const st = await stat(abs).catch(() => null)
    if (!st?.isFile()) throw new Error('File not found.')
    const content = await readFile(abs, 'utf8')
    return { path: toPosixWorkspacePath(path.relative(root, abs)), content }
  })

  ipcMain.handle(ipcChannels.sectionSave, async (_event, input: { path: string; content: string }) => {
    const root = ensureWorkspaceMounted()
    assertMemoirWorkspace()
    const abs = resolveSafeSectionsPath(root, input.path)
    parseMemoirSectionFile(input.content, toPosixWorkspacePath(path.relative(root, abs)))
    await mkdir(path.dirname(abs), { recursive: true })
    await writeFile(abs, input.content, 'utf8')
    return { path: toPosixWorkspacePath(path.relative(root, abs)) }
  })

  ipcMain.handle(
    ipcChannels.sectionSaveStructured,
    async (_event, input: { path: string; section: import('@emprint/shared').MemoirSectionFile }) => {
      const root = ensureWorkspaceMounted()
      assertMemoirWorkspace()
      const abs = resolveSafeSectionsPath(root, input.path)
      const st = await stat(abs).catch(() => null)
      if (!st?.isFile()) throw new Error('File not found.')
      const previousPath = toPosixWorkspacePath(path.relative(root, abs))
      const result = await writeMemoirSectionFile(root, input.section, { previousPath })
      return { path: result.path }
    }
  )

  ipcMain.handle(
    ipcChannels.sectionCreate,
    async (_event, input: { section: import('@emprint/shared').MemoirSectionFile; parentId?: string }) => {
      const root = ensureWorkspaceMounted()
      assertMemoirWorkspace()
      const result = await createMemoirSectionFile(
        root,
        input.section,
        input.parentId ? { parentId: input.parentId } : undefined
      )
      return { path: result.path }
    }
  )

  ipcMain.handle(ipcChannels.sectionsDelete, async (_event, input: { path: string }) => {
    const root = ensureWorkspaceMounted()
    assertMemoirWorkspace()
    const abs = resolveSafeSectionsPath(root, input.path)
    const st = await stat(abs).catch(() => null)
    if (!st?.isFile()) throw new Error('File not found.')
    const relativePath = toPosixWorkspacePath(path.relative(root, abs))
    return deleteMemoirSectionWithCleanup(root, relativePath)
  })

  ipcMain.handle(
    ipcChannels.sectionsReorderChildren,
    async (_event, input: { parentId: string; orderedChildIds: string[] }) => {
      const root = ensureWorkspaceMounted()
      assertMemoirWorkspace()
      await reorderMemoirContainerChildren(root, input.parentId, input.orderedChildIds)
    }
  )

  ipcMain.handle(
    ipcChannels.sectionsReparent,
    async (_event, input: { childId: string; parentId: string | null }) => {
      const root = ensureWorkspaceMounted()
      assertMemoirWorkspace()
      await reparentMemoirSection(root, input.childId, input.parentId)
    }
  )

  ipcMain.handle(
    ipcChannels.sectionsDuplicate,
    async (_event, input: { path: string; mode?: 'shallow' | 'deep' }) => {
      const root = ensureWorkspaceMounted()
      assertMemoirWorkspace()
      const result = await duplicateMemoirSection(root, input.path, input.mode ?? 'shallow')
      return { path: result.path }
    }
  )

  ipcMain.handle(ipcChannels.sectionsReorderRoots, async (_event, input: { orderedIds: string[] }) => {
    const root = ensureWorkspaceMounted()
    assertMemoirWorkspace()
    const { sections } = await loadAllMemoirSectionFiles(root)
    const childIds = new Set<string>()
    for (const section of sections) {
      for (const id of section.children ?? []) {
        childIds.add(id)
      }
    }
    const rootSections = sections.filter((s) => !childIds.has(s.id))
    const rootIdSet = new Set(rootSections.map((s) => s.id))
    for (const id of input.orderedIds) {
      if (!rootIdSet.has(id)) {
        throw new Error(`Section "${id}" is not a root section.`)
      }
    }
    if (input.orderedIds.length !== rootSections.length) {
      throw new Error('Reorder must include every root section exactly once.')
    }
    for (let index = 0; index < input.orderedIds.length; index++) {
      const id = input.orderedIds[index]
      const section = sections.find((s) => s.id === id)
      if (!section || section.order === index) continue
      await writeMemoirSectionFile(root, { ...section, order: index })
    }
  })
}
