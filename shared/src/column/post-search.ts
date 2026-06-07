/** Column post search helpers — plain-text body match + snippets. */

import matter from 'gray-matter'

export type PostSearchMatchField = 'title' | 'description' | 'tags' | 'path' | 'body'

export function plainTextFromMarkdown(content: string): string {
  let body = content
  try {
    body = matter(content).content ?? ''
  } catch {
    body = content.replace(/^---[\s\S]*?---\s*/m, '')
  }
  return body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/#+\s*/g, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
}

export function snippetAroundMatch(plain: string, query: string, maxLen = 120): string {
  const trimmed = plain.trim()
  if (!trimmed) return ''
  const q = query.trim().toLowerCase()
  if (!q) return trimmed.slice(0, maxLen)

  const lower = trimmed.toLowerCase()
  const idx = lower.indexOf(q)
  if (idx === -1) return trimmed.slice(0, maxLen)

  const half = Math.floor((maxLen - q.length) / 2)
  const start = Math.max(0, idx - half)
  const end = Math.min(trimmed.length, start + maxLen)
  let snippet = trimmed.slice(start, end)
  if (start > 0) snippet = `…${snippet}`
  if (end < trimmed.length) snippet = `${snippet}…`
  return snippet
}

export function matchPostFields(input: {
  query: string
  title: string
  description: string
  tags: string[]
  path: string
  bodyPlain: string
}): PostSearchMatchField[] {
  const q = input.query.trim().toLowerCase()
  if (!q) return []

  const matched: PostSearchMatchField[] = []
  if (input.title.toLowerCase().includes(q)) matched.push('title')
  if (input.description.toLowerCase().includes(q)) matched.push('description')
  if (input.path.toLowerCase().includes(q)) matched.push('path')
  if (input.tags.some((t) => t.toLowerCase().includes(q))) matched.push('tags')
  if (input.bodyPlain.toLowerCase().includes(q)) matched.push('body')
  return matched
}
