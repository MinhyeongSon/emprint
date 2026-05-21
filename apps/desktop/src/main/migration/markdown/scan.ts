import type { Dirent } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import matter from 'gray-matter'
import type { MarkdownMigrationScanResult } from '@emprint/shared'

const SKIP_DIR_NAMES = new Set(['.git', 'node_modules', 'dist', '.astro', 'out'])

export async function collectMarkdownFiles(dir: string, out: string[] = []): Promise<string[]> {
  let entries: Dirent<string>[]
  try {
    entries = (await readdir(dir, { withFileTypes: true })) as Dirent<string>[]
  } catch {
    return out
  }

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (SKIP_DIR_NAMES.has(entry.name)) continue
      await collectMarkdownFiles(full, out)
      continue
    }
    if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
      out.push(full)
    }
  }
  return out
}

export async function scanMarkdownSourceDir(sourceDir: string): Promise<MarkdownMigrationScanResult> {
  const root = path.resolve(sourceDir.trim())
  const files = await collectMarkdownFiles(root)

  const keys = new Set<string>()
  for (const filePath of files) {
    try {
      const raw = await readFile(filePath, 'utf8')
      const parsed = matter(raw)
      for (const key of Object.keys(parsed.data ?? {})) {
        if (key.trim()) keys.add(key.trim())
      }
    } catch {
      /* unreadable or no frontmatter */
    }
  }

  return {
    fileCount: files.length,
    frontmatterKeys: [...keys].sort((a, b) => a.localeCompare(b))
  }
}
