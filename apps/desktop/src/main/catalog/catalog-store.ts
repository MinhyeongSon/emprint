import { app } from 'electron'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { WorkspaceCatalogEntry } from '@emprint/shared'

export type WorkspaceCatalog = WorkspaceCatalogEntry[]

export function userCatalogPath(): string {
  return path.join(app.getPath('userData'), 'catalog.json')
}

export async function readCatalog(): Promise<WorkspaceCatalog> {
  try {
    const raw = await readFile(userCatalogPath(), 'utf8')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as WorkspaceCatalog) : []
  } catch {
    return []
  }
}

export async function writeCatalog(catalog: WorkspaceCatalog): Promise<void> {
  await writeFile(userCatalogPath(), JSON.stringify(catalog, null, 2), 'utf8')
}

export function upsertCatalogEntry(catalog: WorkspaceCatalog, entry: WorkspaceCatalogEntry): WorkspaceCatalog {
  const next = catalog.filter((existing) => existing.id !== entry.id)
  next.unshift(entry)
  return next
}
