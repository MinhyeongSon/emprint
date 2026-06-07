import { markdownPostDocument } from '@emprint/core'
import { normalizeIndexPath } from '@emprint/shared'
import type { KnowledgeSummary } from '@emprint/shared'

export function inferTitleFromPath(relativePath: string): string {
  const name = relativePath.split('/').pop() ?? relativePath
  return name.replace(/\.md$/i, '').replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/-/g, ' ') || ''
}

export function formatKnowledgeDate(value: string): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toISOString().slice(0, 10)
}

export function snippetFromMarkdown(content: string): string {
  const withoutFrontmatter = content.replace(/^---[\s\S]*?---\s*/m, '')
  const plain = withoutFrontmatter
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/#+\s*/g, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
  return plain.slice(0, 180)
}

export function parseKnowledge(content: string): { data: Record<string, unknown>; body: string } {
  const doc = markdownPostDocument.importMarkdown(content)
  return { data: doc.frontmatter, body: doc.body }
}

export function buildKnowledgeMarkdown(input: { data: Record<string, unknown>; body: string }): string {
  return markdownPostDocument.exportMarkdown({ frontmatter: input.data, body: input.body })
}

export function knowledgeFrontmatterFromEditor(input: {
  existing: Record<string, unknown>
  title: string
  tags: string[]
  index: string
  draft: boolean
}): Record<string, unknown> {
  const indexPath = normalizeIndexPath(input.index)
  const nextData: Record<string, unknown> = {
    ...input.existing,
    title: input.title.trim() || input.existing.title,
    tags: normalizeTagArray(input.tags),
    draft: input.draft
  }
  if (indexPath) {
    nextData.index = indexPath
  } else {
    delete nextData.index
  }
  return nextData
}

export function normalizeTagArray(tags: string[]): string[] {
  return Array.from(new Set(tags.map((t) => t.trim()).filter(Boolean)))
}

export function splitCommittedTagsAndTail(draft: string): { committed: string[]; tail: string } {
  const lastComma = draft.lastIndexOf(',')
  if (lastComma === -1) return { committed: [], tail: draft }
  const head = draft.slice(0, lastComma)
  const tail = draft.slice(lastComma + 1)
  const committed = normalizeTagArray(
    head
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  )
  return { committed, tail }
}

export function rebuildTagDraft(committed: string[], tail: string): string {
  if (committed.length === 0) return tail
  return `${committed.join(', ')}, ${tail}`
}

export function parseTagsDraft(value: string): string[] {
  return normalizeTagArray(
    value
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
  )
}

export function matchesKnowledgeSearch(item: KnowledgeSummary, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const indexPath = item.index ?? ''
  const segments = indexPath ? indexPath.split('/') : []
  const haystack = [item.title, item.description, item.path, indexPath, ...segments, ...item.tags]
    .join(' ')
    .toLowerCase()
  return haystack.includes(q)
}

export function buildNewKnowledgeTemplate(input: { index?: string; draft: boolean; title?: string }): string {
  const title = input.title?.trim() || 'Untitled'
  const indexValue = input.index?.trim() ?? ''
  const lines = [
    '---',
    `title: ${JSON.stringify(title)}`,
    `index: ${JSON.stringify(indexValue)}`,
    'tags: []',
    `draft: ${input.draft}`,
    '---',
    '',
    ''
  ]
  return lines.join('\n')
}
