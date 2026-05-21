import { readFile, writeFile, mkdir, access } from 'node:fs/promises'
import path from 'node:path'
import type { TistoryMigrationRunInput, TistoryMigrationRunResult } from '@emprint/shared'
import { postFilenameFromTitleAndDate, slugifyForPath } from '../slug.js'
import { parseTistoryPostHtml, plainTextExcerpt } from './parse.js'
import {
  buildEmprintPostMarkdown,
  importImagesFromHtml,
  tistoryContentHtmlToMarkdown
} from './html-to-markdown.js'
import { findTistoryHtmlInPostDir, scanTistoryBackup } from './scan.js'

export async function runTistoryMigration(
  workspaceRoot: string,
  input: TistoryMigrationRunInput
): Promise<TistoryMigrationRunResult> {
  const backupDir = path.resolve(input.backupDir.trim())
  const importAsDraft = input.importAsDraft !== false
  const skipExisting = input.skipExisting !== false
  const section = importAsDraft ? 'drafts' : 'posts'
  const sectionDir = path.join(workspaceRoot, section)
  await mkdir(sectionDir, { recursive: true })

  const { posts } = await scanTistoryBackup(backupDir)
  const usedFilenames = new Set<string>()
  let imported = 0
  let skipped = 0
  let failed = 0
  const failures: TistoryMigrationRunResult['failures'] = []

  for (const preview of posts) {
    try {
      const postDir = path.join(backupDir, preview.postId)
      const htmlPath = await findTistoryHtmlInPostDir(postDir)
      if (!htmlPath) {
        failed += 1
        failures.push({
          postId: preview.postId,
          title: preview.title,
          message: 'HTML file not found in post folder.'
        })
        continue
      }

      const html = await readFile(htmlPath, 'utf8')
      const parsed = parseTistoryPostHtml(html)
      const postSlug = slugifyForPath(parsed.title)
      const fileName = postFilenameFromTitleAndDate(parsed.title, parsed.date, usedFilenames)
      const relativePath = `${section}/${fileName}`
      const destAbs = path.join(workspaceRoot, relativePath)

      if (skipExisting) {
        try {
          await access(destAbs)
          skipped += 1
          continue
        } catch {
          /* file does not exist */
        }
      }

      const { srcToMarkdownPath } = await importImagesFromHtml(
        parsed.contentHtml,
        path.dirname(htmlPath),
        workspaceRoot,
        postSlug
      )
      const body = tistoryContentHtmlToMarkdown(parsed.contentHtml, srcToMarkdownPath)
      const markdown = buildEmprintPostMarkdown({
        title: parsed.title,
        description: plainTextExcerpt(body),
        tags: parsed.tags,
        date: parsed.date,
        draft: importAsDraft,
        body
      })

      await writeFile(destAbs, markdown, 'utf8')
      imported += 1
    } catch (caught) {
      failed += 1
      failures.push({
        postId: preview.postId,
        title: preview.title,
        message: caught instanceof Error ? caught.message : String(caught)
      })
    }
  }

  return { imported, skipped, failed, failures }
}
