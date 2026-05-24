/** Dictionary index registry — `config/index-registry.json` (first-class topic tree). */

import {
  buildIndexTree,
  indexPathPrefixes,
  normalizeIndexPath,
  type IndexTreeNode
} from './index-path'

export const INDEX_REGISTRY_RELATIVE_PATH = 'config/index-registry.json'

export interface IndexRegistryEntry {
  path: string
  label?: string
  description?: string
}

export interface IndexRegistryFile {
  contractVersion: 1
  entries: IndexRegistryEntry[]
}

export interface IndexEntrySummary extends IndexRegistryEntry {
  /** Published knowledge entries under this exact path (not descendants). */
  knowledgeCount: number
  /** Including entries under descendant index paths. */
  totalKnowledgeCount: number
}

export function createDefaultIndexRegistry(locale: 'en' | 'ko'): IndexRegistryFile {
  const gettingStarted = locale === 'ko' ? '시작하기' : 'Getting started'
  return {
    contractVersion: 1,
    entries: [{ path: gettingStarted, label: gettingStarted }]
  }
}

export function parseIndexRegistryFile(raw: string): IndexRegistryFile {
  const parsed = JSON.parse(raw) as IndexRegistryFile
  if (parsed.contractVersion !== 1 || !Array.isArray(parsed.entries)) {
    throw new Error('Unsupported index-registry.json contract.')
  }
  const entries: IndexRegistryEntry[] = []
  const seen = new Set<string>()
  for (const item of parsed.entries) {
    if (!item || typeof item.path !== 'string') continue
    const path = normalizeIndexPath(item.path)
    if (!path || seen.has(path)) continue
    seen.add(path)
    const entry: IndexRegistryEntry = { path }
    if (typeof item.label === 'string' && item.label.trim()) entry.label = item.label.trim()
    if (typeof item.description === 'string' && item.description.trim()) {
      entry.description = item.description.trim()
    }
    entries.push(entry)
  }
  entries.sort((a, b) => a.path.localeCompare(b.path, undefined, { sensitivity: 'base' }))
  return { contractVersion: 1, entries }
}

export function serializeIndexRegistryFile(file: IndexRegistryFile): string {
  const normalized: IndexRegistryFile = {
    contractVersion: 1,
    entries: file.entries
      .map((e) => {
        const path = normalizeIndexPath(e.path)
        if (!path) return null
        const out: IndexRegistryEntry = { path }
        if (e.label?.trim()) out.label = e.label.trim()
        if (e.description?.trim()) out.description = e.description.trim()
        return out
      })
      .filter((e): e is IndexRegistryEntry => e !== null)
      .sort((a, b) => a.path.localeCompare(b.path, undefined, { sensitivity: 'base' }))
  }
  return `${JSON.stringify(normalized, null, 2)}\n`
}

/** Ensure every parent prefix of each entry exists as registry rows. */
export function ensureParentIndexEntries(entries: IndexRegistryEntry[]): IndexRegistryEntry[] {
  const byPath = new Map<string, IndexRegistryEntry>()
  for (const entry of entries) {
    const path = normalizeIndexPath(entry.path)
    if (!path) continue
    byPath.set(path, { ...entry, path })
    for (const prefix of indexPathPrefixes(path)) {
      if (prefix === path) continue
      if (!byPath.has(prefix)) {
        const segments = prefix.split('/')
        const leaf = segments[segments.length - 1]
        const parentEntry: IndexRegistryEntry = { path: prefix }
        if (leaf) parentEntry.label = leaf
        byPath.set(prefix, parentEntry)
      }
    }
  }
  return [...byPath.values()].sort((a, b) => a.path.localeCompare(b.path, undefined, { sensitivity: 'base' }))
}

export function registryToIndexTree(entries: IndexRegistryEntry[]): IndexTreeNode[] {
  return buildIndexTree(entries.map((e) => e.path))
}

export function collectRegistryPaths(entries: IndexRegistryEntry[]): Set<string> {
  return new Set(entries.map((e) => normalizeIndexPath(e.path)).filter(Boolean))
}
