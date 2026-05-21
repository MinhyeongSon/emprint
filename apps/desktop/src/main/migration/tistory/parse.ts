export type TistoryParsedPost = {
  title: string
  date: string
  category?: string
  tags: string[]
  contentHtml: string
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
}

function stripHtmlTags(text: string): string {
  return decodeHtmlEntities(text.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim())
}

function extractMatch(html: string, pattern: RegExp): string | undefined {
  const match = html.match(pattern)
  if (!match?.[1]) return undefined
  return stripHtmlTags(match[1])
}

function parseTagsBlock(html: string): string[] {
  const block = html.match(/<div class="tags">([\s\S]*?)<\/div>/i)?.[1]
  if (!block) return []
  const tags: string[] = []
  const linkPattern = /<a[^>]*>([\s\S]*?)<\/a>/gi
  let m: RegExpExecArray | null
  while ((m = linkPattern.exec(block))) {
    const raw = m[1]
    if (!raw) continue
    const tag = stripHtmlTags(raw)
    if (tag) tags.push(tag)
  }
  if (tags.length > 0) return tags

  const plain = stripHtmlTags(block)
  if (!plain) return []
  return plain
    .split(/#+/)
    .map((part) => part.trim())
    .filter(Boolean)
}

function parseDate(raw: string | undefined): string {
  if (!raw) return new Date().toISOString().slice(0, 10)
  const trimmed = raw.trim()
  const isoDay = trimmed.slice(0, 10)
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoDay)) return isoDay
  const parsed = new Date(trimmed)
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10)
  return new Date().toISOString().slice(0, 10)
}

export function parseTistoryPostHtml(html: string): TistoryParsedPost {
  const title =
    extractMatch(html, /<h2 class="title-article">([\s\S]*?)<\/h2>/i) ??
    extractMatch(html, /<title>([\s\S]*?)<\/title>/i) ??
    'Untitled'

  const category = extractMatch(html, /<p class="category">([\s\S]*?)<\/p>/i)
  const date = parseDate(extractMatch(html, /<p class="date">([\s\S]*?)<\/p>/i))

  const categoryTags = category
    ? category
        .split('/')
        .map((part) => part.trim())
        .filter(Boolean)
    : []
  const explicitTags = parseTagsBlock(html)
  const tags = Array.from(new Set([...categoryTags, ...explicitTags]))

  const contentHtml =
    html.match(/<div class="contents_style">([\s\S]*?)<\/div>/i)?.[1]?.trim() ?? ''

  return { title, date, ...(category ? { category } : {}), tags, contentHtml }
}

export function plainTextExcerpt(markdown: string, maxLen = 200): string {
  const plain = markdown
    .replace(/^---[\s\S]*?---\s*/m, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[#*_>`~|-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return plain.length <= maxLen ? plain : `${plain.slice(0, maxLen - 1)}…`
}
