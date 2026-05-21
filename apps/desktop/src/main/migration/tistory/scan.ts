import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import type { TistoryMigrationPostPreview, TistoryMigrationScanResult } from '@emprint/shared'
import { parseTistoryPostHtml } from './parse.js'

export async function findTistoryHtmlInPostDir(dir: string): Promise<string | null> {
  const entries = await readdir(dir, { withFileTypes: true })
  const htmlFiles = entries.filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.html'))
  const preferred =
    htmlFiles.find((e) => e.name.startsWith(path.basename(dir))) ?? htmlFiles[0]
  if (!preferred) return null
  return path.join(dir, preferred.name)
}

export async function scanTistoryBackup(backupDir: string): Promise<TistoryMigrationScanResult> {
  const root = path.resolve(backupDir.trim())
  const entries = await readdir(root, { withFileTypes: true })
  const posts: TistoryMigrationPostPreview[] = []

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue

    const postDir = path.join(root, entry.name)
    const htmlPath = await findTistoryHtmlInPostDir(postDir)
    if (!htmlPath) continue

    try {
      const html = await readFile(htmlPath, 'utf8')
      const parsed = parseTistoryPostHtml(html)
      posts.push({
        postId: entry.name,
        title: parsed.title,
        date: parsed.date,
        ...(parsed.category ? { category: parsed.category } : {}),
        htmlFileName: path.basename(htmlPath)
      })
    } catch {
      /* skip unreadable posts */
    }
  }

  posts.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  return { posts }
}
