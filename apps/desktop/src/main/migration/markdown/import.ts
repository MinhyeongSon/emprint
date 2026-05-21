import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import matter from 'gray-matter'
import type {
  EmprintMarkdownField,
  MarkdownFieldMapping,
  MarkdownMigrationFailure,
  MarkdownMigrationRunInput,
  MarkdownMigrationRunResult
} from '@emprint/shared'
import { collectMarkdownFiles } from './scan.js'

function buildSourceToEmprintMap(mappings: MarkdownFieldMapping[]): Map<string, EmprintMarkdownField> {
  const map = new Map<string, EmprintMarkdownField>()
  for (const row of mappings) {
    const source = row.sourceKey.trim()
    if (!source) continue
    map.set(source, row.emprintField)
  }
  return map
}

function normalizeFieldValue(field: EmprintMarkdownField, value: unknown): unknown {
  if (value === undefined || value === null) return undefined

  if (field === 'tags') {
    if (Array.isArray(value)) return value.map(String)
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    }
    return [String(value)]
  }

  if (field === 'draft') {
    if (typeof value === 'boolean') return value
    if (typeof value === 'string') {
      const lower = value.trim().toLowerCase()
      if (lower === 'true' || lower === 'yes' || lower === '1') return true
      if (lower === 'false' || lower === 'no' || lower === '0') return false
    }
    return Boolean(value)
  }

  if (field === 'createdAt' || field === 'updatedAt') {
    if (value instanceof Date) return value.toISOString().slice(0, 10)
    const text = String(value).trim()
    if (!text) return undefined
    const day = text.slice(0, 10)
    if (/^\d{4}-\d{2}-\d{2}$/.test(day)) return day
    const parsed = new Date(text)
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10)
    return text
  }

  if (field === 'title' || field === 'description') {
    return String(value).trim()
  }

  return value
}

function mapFrontmatter(
  sourceData: Record<string, unknown>,
  keyMap: Map<string, EmprintMarkdownField>
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(sourceData)) {
    const target = keyMap.get(key)
    if (!target) continue
    const normalized = normalizeFieldValue(target, value)
    if (normalized !== undefined && normalized !== '') {
      out[target] = normalized
    }
  }
  return out
}

function inferTitleFromFileName(filePath: string): string {
  const base = path.basename(filePath, path.extname(filePath))
  const withoutDate = base.replace(/^\d{4}-\d{2}-\d{2}-/, '')
  const title = withoutDate.replace(/-/g, ' ').trim()
  return title || base
}

function uniqueDestPath(sectionDir: string, fileName: string, used: Set<string>): string {
  let name = fileName
  let n = 2
  while (used.has(name.toLowerCase())) {
    const ext = path.extname(fileName)
    const stem = path.basename(fileName, ext)
    name = `${stem}-${n}${ext}`
    n += 1
  }
  used.add(name.toLowerCase())
  return path.join(sectionDir, name)
}

export async function runMarkdownMigration(
  workspaceRoot: string,
  input: MarkdownMigrationRunInput
): Promise<MarkdownMigrationRunResult> {
  const sourceDir = path.resolve(input.sourceDir.trim())
  const importAsDraft = input.importAsDraft !== false
  const skipExisting = input.skipExisting !== false
  const keyMap = buildSourceToEmprintMap(input.mappings)

  const files = await collectMarkdownFiles(sourceDir)
  if (files.length === 0) {
    return { imported: 0, skipped: 0, failed: 0, failures: [] }
  }

  const section = importAsDraft ? 'drafts' : 'posts'
  const sectionDir = path.join(workspaceRoot, section)
  await mkdir(sectionDir, { recursive: true })

  const usedNames = new Set<string>()
  let imported = 0
  let skipped = 0
  let failed = 0
  const failures: MarkdownMigrationFailure[] = []

  for (const filePath of files) {
    const fileName = path.basename(filePath)
    try {
      const raw = await readFile(filePath, 'utf8')
      const parsed = matter(raw)
      const data = mapFrontmatter((parsed.data ?? {}) as Record<string, unknown>, keyMap)

      if (!data.title || typeof data.title !== 'string' || !String(data.title).trim()) {
        data.title = inferTitleFromFileName(filePath)
      }

      data.draft = importAsDraft

      const destAbs = uniqueDestPath(sectionDir, fileName, usedNames)

      if (skipExisting) {
        try {
          await access(destAbs)
          skipped += 1
          continue
        } catch {
          /* new file */
        }
      }

      const content = matter.stringify(parsed.content ?? '', data)
      await writeFile(destAbs, content, 'utf8')
      imported += 1
    } catch (caught) {
      failed += 1
      failures.push({
        fileName,
        message: caught instanceof Error ? caught.message : String(caught)
      })
    }
  }

  return { imported, skipped, failed, failures }
}
