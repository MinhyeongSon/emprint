import { existsSync } from 'node:fs'
import path from 'node:path'
import { readFile, writeFile } from 'node:fs/promises'
import matter from 'gray-matter'
import {
  INDEX_REGISTRY_RELATIVE_PATH,
  buildIndexTree,
  collectRegistryPaths,
  ensureParentIndexEntries,
  indexPathPrefixes,
  isIndexPrefix,
  normalizeIndexPath,
  parseIndexRegistryFile,
  serializeIndexRegistryFile,
  type IndexEntrySummary,
  type IndexRegistryEntry,
  type IndexRegistryFile,
  type IndexTreeNode
} from '@emprint/shared'
import { parseKnowledgeSummary } from '@emprint/core'
import { safeListDirectory, toPosixWorkspacePath } from './core'

export function indexRegistryPath(workspaceRoot: string): string {
  return path.join(workspaceRoot, INDEX_REGISTRY_RELATIVE_PATH)
}

export async function readIndexRegistry(workspaceRoot: string): Promise<IndexRegistryFile> {
  const abs = indexRegistryPath(workspaceRoot)
  if (!existsSync(abs)) {
    return { contractVersion: 1, entries: [] }
  }
  const raw = await readFile(abs, 'utf8')
  return parseIndexRegistryFile(raw)
}

export async function writeIndexRegistry(workspaceRoot: string, file: IndexRegistryFile): Promise<void> {
  const entries = ensureParentIndexEntries(file.entries)
  const abs = indexRegistryPath(workspaceRoot)
  await writeFile(abs, serializeIndexRegistryFile({ contractVersion: 1, entries }), 'utf8')
}

async function collectKnowledgeIndexUsage(workspaceRoot: string): Promise<Map<string, number>> {
  const counts = new Map<string, number>()
  for (const section of ['knowledge', 'drafts'] as const) {
    const dir = path.join(workspaceRoot, section)
    if (!existsSync(dir)) continue
    const files = await safeListDirectory(dir)
    for (const fileName of files) {
      if (!fileName.toLowerCase().endsWith('.md')) continue
      try {
        const content = await readFile(path.join(dir, fileName), 'utf8')
        const rel = `${section}/${fileName}`
        const index = normalizeIndexPath(parseKnowledgeSummary(rel, content).index)
        if (!index) continue
        counts.set(index, (counts.get(index) ?? 0) + 1)
      } catch {
        // skip
      }
    }
  }
  return counts
}

export async function listIndexEntries(workspaceRoot: string): Promise<IndexEntrySummary[]> {
  const registry = await readIndexRegistry(workspaceRoot)
  const usage = await collectKnowledgeIndexUsage(workspaceRoot)
  const entries = ensureParentIndexEntries(registry.entries)

  return entries.map((entry) => {
    const exact = usage.get(entry.path) ?? 0
    let total = 0
    for (const [idx, count] of usage) {
      if (isIndexPrefix(entry.path, idx)) total += count
    }
    return {
      ...entry,
      knowledgeCount: exact,
      totalKnowledgeCount: total
    }
  })
}

function applyRegistryLabels(nodes: IndexTreeNode[], labelByPath: Map<string, string>): IndexTreeNode[] {
  return nodes.map((node) => ({
    ...node,
    label: labelByPath.get(node.path) ?? node.label,
    children: applyRegistryLabels(node.children, labelByPath)
  }))
}

export async function buildRegistryIndexTree(workspaceRoot: string): Promise<IndexTreeNode[]> {
  const registry = await readIndexRegistry(workspaceRoot)
  const entries = ensureParentIndexEntries(registry.entries)
  const labelByPath = new Map<string, string>()
  for (const entry of entries) {
    const segments = entry.path.split('/')
    labelByPath.set(entry.path, entry.label?.trim() || segments[segments.length - 1] || entry.path)
  }

  const paths = new Set(collectRegistryPaths(entries))
  const usage = await collectKnowledgeIndexUsage(workspaceRoot)
  for (const idx of usage.keys()) {
    if (!idx) continue
    paths.add(idx)
    for (const prefix of indexPathPrefixes(idx)) {
      paths.add(prefix)
    }
  }

  return applyRegistryLabels(buildIndexTree(paths), labelByPath)
}

export async function createIndexEntry(
  workspaceRoot: string,
  input: { path: string; label?: string; description?: string }
): Promise<IndexRegistryEntry> {
  const pathNorm = normalizeIndexPath(input.path)
  if (!pathNorm) throw new Error('Index path is required.')

  const registry = await readIndexRegistry(workspaceRoot)
  const entries = ensureParentIndexEntries(registry.entries)
  if (entries.some((e) => e.path === pathNorm)) {
    throw new Error('This index path already exists.')
  }

  const entry: IndexRegistryEntry = { path: pathNorm }
  if (input.label?.trim()) entry.label = input.label.trim()
  if (input.description?.trim()) entry.description = input.description.trim()

  entries.push(entry)
  await writeIndexRegistry(workspaceRoot, { contractVersion: 1, entries })
  return entry
}

export async function updateIndexEntry(
  workspaceRoot: string,
  input: { path: string; label?: string; description?: string }
): Promise<IndexRegistryEntry> {
  const pathNorm = normalizeIndexPath(input.path)
  const registry = await readIndexRegistry(workspaceRoot)
  const entries = ensureParentIndexEntries(registry.entries)
  const idx = entries.findIndex((e) => e.path === pathNorm)
  if (idx === -1) throw new Error('Index path not found.')

  const entry = entries[idx]!
  if (input.label !== undefined) {
    const trimmed = input.label.trim()
    if (trimmed) entry.label = trimmed
    else delete entry.label
  }
  if (input.description !== undefined) {
    const trimmed = input.description.trim()
    if (trimmed) entry.description = trimmed
    else delete entry.description
  }

  await writeIndexRegistry(workspaceRoot, { contractVersion: 1, entries })
  return entry
}

function hasRegistryChild(entries: IndexRegistryEntry[], path: string): boolean {
  const prefix = `${path}/`
  return entries.some((e) => e.path.startsWith(prefix))
}

export async function deleteIndexEntry(
  workspaceRoot: string,
  input: { path: string }
): Promise<void> {
  const pathNorm = normalizeIndexPath(input.path)
  const registry = await readIndexRegistry(workspaceRoot)
  let entries = ensureParentIndexEntries(registry.entries)

  if (hasRegistryChild(entries, pathNorm)) {
    throw new Error('Remove child index paths first.')
  }

  const usage = await collectKnowledgeIndexUsage(workspaceRoot)
  let refCount = 0
  for (const [idx, count] of usage) {
    if (isIndexPrefix(pathNorm, idx)) refCount += count
  }
  if (refCount > 0) {
    throw new Error('Knowledge entries still use this index path. Reassign or delete them first.')
  }

  entries = entries.filter((e) => e.path !== pathNorm)
  await writeIndexRegistry(workspaceRoot, { contractVersion: 1, entries })
}

export async function renameIndexEntry(
  workspaceRoot: string,
  input: { from: string; to: string }
): Promise<void> {
  const from = normalizeIndexPath(input.from)
  const to = normalizeIndexPath(input.to)
  if (!from || !to) throw new Error('Both paths are required.')
  if (from === to) return

  const registry = await readIndexRegistry(workspaceRoot)
  let entries = ensureParentIndexEntries(registry.entries)
  if (!entries.some((e) => e.path === from)) {
    throw new Error('Source index path not found.')
  }
  if (entries.some((e) => e.path === to || e.path.startsWith(`${to}/`))) {
    throw new Error('Target index path already exists.')
  }

  entries = entries.map((e) => {
    if (e.path === from) return { ...e, path: to }
    if (e.path.startsWith(`${from}/`)) {
      return { ...e, path: `${to}${e.path.slice(from.length)}` }
    }
    return e
  })

  await writeIndexRegistry(workspaceRoot, { contractVersion: 1, entries })
  await rewriteKnowledgeIndexPaths(workspaceRoot, from, to)
}

async function rewriteKnowledgeIndexPaths(
  workspaceRoot: string,
  from: string,
  to: string
): Promise<void> {
  for (const section of ['knowledge', 'drafts'] as const) {
    const dir = path.join(workspaceRoot, section)
    if (!existsSync(dir)) continue
    const files = await safeListDirectory(dir)
    for (const fileName of files) {
      if (!fileName.toLowerCase().endsWith('.md')) continue
      const rel = toPosixWorkspacePath(`${section}/${fileName}`)
      const abs = path.join(workspaceRoot, rel)
      const content = await readFile(abs, 'utf8')
      const parsed = matter(content)
      const current = normalizeIndexPath(String(parsed.data.index ?? ''))
      if (!current || !isIndexPrefix(from, current)) continue
      const next =
        current === from ? to : `${to}${current.slice(from.length)}`
      parsed.data.index = next
      await writeFile(abs, matter.stringify(parsed.content, parsed.data), 'utf8')
    }
  }
}

export function resolveIndexCreatePath(input: {
  parentPath?: string
  segment?: string
  path?: string
}): string {
  if (input.path?.trim()) return normalizeIndexPath(input.path)
  const segment = input.segment?.trim()
  if (!segment) throw new Error('Index name is required.')
  if (segment.includes('/')) throw new Error('Index name cannot contain "/".')
  const parent = normalizeIndexPath(input.parentPath ?? '')
  return parent ? `${parent}/${segment}` : segment
}
