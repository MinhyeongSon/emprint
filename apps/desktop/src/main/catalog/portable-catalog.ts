import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import type { WorkspaceCatalogEntry } from '@emprint/shared'

const EMPRINT_META_DIR = '.emprint'
const PORTABLE_CATALOG_FILE = 'catalog.json'

export function portableCatalogPath(workspaceRootDir: string): string {
  return path.join(path.resolve(workspaceRootDir), EMPRINT_META_DIR, PORTABLE_CATALOG_FILE)
}

export async function readPortableCatalog(workspaceRootDir: string): Promise<WorkspaceCatalogEntry[]> {
  try {
    const raw = await readFile(portableCatalogPath(workspaceRootDir), 'utf8')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as WorkspaceCatalogEntry[]) : []
  } catch {
    return []
  }
}

/** Mirror catalog beside anthologies so reinstall + same root can recover the index. */
export async function writePortableCatalog(
  workspaceRootDir: string,
  catalog: WorkspaceCatalogEntry[]
): Promise<void> {
  const filePath = portableCatalogPath(workspaceRootDir)
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, JSON.stringify(catalog, null, 2), 'utf8')
}
