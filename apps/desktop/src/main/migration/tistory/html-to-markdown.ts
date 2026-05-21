import path from 'node:path'
import { copyFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import matter from 'gray-matter'

export type ImageImportResult = {
  /** Map from original src attribute (e.g. `./img/foo.png`) to markdown path `/assets/images/foo.png`. */
  srcToMarkdownPath: Map<string, string>
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&lsquo;/gi, "'")
    .replace(/&rsquo;/gi, "'")
    .replace(/&ldquo;/gi, '"')
    .replace(/&rdquo;/gi, '"')
    .replace(/&bull;/gi, '•')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
}

function stripTags(text: string): string {
  return decodeHtmlEntities(text.replace(/<[^>]+>/g, ''))
}

function slugifyAssetBase(value: string): string {
  const base = path.basename(value, path.extname(value))
  return (
    base
      .normalize('NFKC')
      .trim()
      .toLowerCase()
      .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
      .replace(/^[-.]+|[-.]+$/g, '') || 'image'
  )
}

function buildUniqueAssetPath(imagesDir: string, baseName: string, ext: string): string {
  let candidate = path.join(imagesDir, `${baseName}.${ext}`)
  let counter = 2
  while (existsSync(candidate)) {
    candidate = path.join(imagesDir, `${baseName}-${counter}.${ext}`)
    counter += 1
  }
  return candidate
}

function resolveImageSource(src: string, postDir: string): string {
  const cleaned = src.trim().replace(/^\.\//, '')
  return path.resolve(postDir, cleaned)
}

export async function importImagesFromHtml(
  html: string,
  postDir: string,
  workspaceRoot: string,
  postSlug: string
): Promise<ImageImportResult> {
  const srcToMarkdownPath = new Map<string, string>()
  const imagesDir = path.join(workspaceRoot, 'assets', 'images')
  await mkdir(imagesDir, { recursive: true })

  const imgPattern = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi
  let match: RegExpExecArray | null
  const seen = new Set<string>()

  while ((match = imgPattern.exec(html))) {
    const src = match[1]
    if (!src || seen.has(src) || /^https?:\/\//i.test(src)) continue
    seen.add(src)

    const absSource = resolveImageSource(src, postDir)
    if (!existsSync(absSource)) continue

    const ext = path.extname(absSource).replace(/^\./, '') || 'png'
    const baseName = `${postSlug}-${slugifyAssetBase(path.basename(absSource))}`
    const destAbs = buildUniqueAssetPath(imagesDir, baseName, ext)
    await copyFile(absSource, destAbs)

    const rel = path.relative(workspaceRoot, destAbs).split(path.sep).join('/')
    srcToMarkdownPath.set(src, `/${rel}`)
  }

  return { srcToMarkdownPath }
}

/** Inline-only HTML → markdown (bold, links, line breaks, inline code). */
function convertInlineHtml(html: string): string {
  let s = html
  let guard = 0
  while (/<span[^>]*>/i.test(s) && guard < 32) {
    s = s.replace(/<span[^>]*>([\s\S]*?)<\/span>/gi, '$1')
    guard += 1
  }

  s = s
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, (_, code: string) => `\`${decodeHtmlEntities(code).trim()}\``)
    .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, (_, inner: string) => `**${convertInlineHtml(inner)}**`)
    .replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, (_, inner: string) => `**${convertInlineHtml(inner)}**`)
    .replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, (_, inner: string) => `*${convertInlineHtml(inner)}*`)
    .replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, (_, inner: string) => `*${convertInlineHtml(inner)}*`)
    .replace(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_, href: string, label: string) => {
      const text = stripTags(convertInlineHtml(label)) || href
      return `[${text}](${href})`
    })

  return decodeHtmlEntities(s.replace(/<[^>]+>/g, ''))
}

function rewriteOpenGraphCards(html: string): string {
  return html.replace(
    /<figure[^>]*data-ke-type=["']opengraph["'][^>]*>[\s\S]*?<\/figure>/gi,
    (block) => {
      const url =
        block.match(/data-og-url=["']([^"']+)["']/i)?.[1] ??
        block.match(/data-og-source-url=["']([^"']+)["']/i)?.[1] ??
        block.match(/<a[^>]+href=["']([^"']+)["']/i)?.[1]
      const title = decodeHtmlEntities(block.match(/data-og-title=["']([^"']*)["']/i)?.[1] ?? '').trim()
      const description = decodeHtmlEntities(
        block.match(/data-og-description=["']([^"']*)["']/i)?.[1] ?? ''
      ).trim()
      if (!url) return ''
      const lines = [`> **${title || url}**`, ...(description ? [description] : []), `> ${url}`]
      return `\n\n${lines.join('\n')}\n\n`
    }
  )
}

function rewritePreBlocks(html: string): string {
  return html
    .replace(
      /<pre[^>]*data-ke-language=["']([^"']+)["'][^>]*>[\s\S]*?<code[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/gi,
      (_, lang: string, code: string) => {
        const body = decodeHtmlEntities(code).trimEnd()
        return `\n\n\`\`\`${lang || ''}\n${body}\n\`\`\`\n\n`
      }
    )
    .replace(/<pre[^>]*>[\s\S]*?<code[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/gi, (_, code: string) => {
      const body = decodeHtmlEntities(code).trimEnd()
      return `\n\n\`\`\`\n${body}\n\`\`\`\n\n`
    })
}

function rewriteFigures(html: string, srcToMarkdownPath: Map<string, string>): string {
  return html
    .replace(
      /<figure(?![^>]*data-ke-type=["']opengraph["'])[^>]*>[\s\S]*?<img[^>]+src=["']([^"']+)["'][^>]*>[\s\S]*?(?:<figcaption>([\s\S]*?)<\/figcaption>)?[\s\S]*?<\/figure>/gi,
      (_, src: string, caption?: string) => {
        const mdPath = srcToMarkdownPath.get(src) ?? src
        const alt = caption ? stripTags(caption) : ''
        const cap = caption?.trim() ? `\n*${stripTags(caption)}*` : ''
        return `\n\n![${alt}](${mdPath})${cap}\n\n`
      }
    )
    .replace(/<img[^>]+src=["']([^"']+)["'][^>]*\/?>/gi, (_, src: string) => {
      const mdPath = srcToMarkdownPath.get(src) ?? src
      return `\n\n![](${mdPath})\n\n`
    })
}

function rewriteHorizontalRules(html: string): string {
  return html.replace(/<hr[^>]*\/?>/gi, '\n\n---\n\n')
}

function rewriteBlockquotes(html: string): string {
  return html.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, inner: string) => {
    const text = convertInlineHtml(inner)
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
    if (text.length === 0) return '\n'
    return `\n\n${text.map((line) => `> ${line}`).join('\n')}\n\n`
  })
}

function rewriteTables(html: string): string {
  return html.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (_, tableInner: string) => {
    const rows = [...tableInner.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
    const lines = rows
      .map((row) => {
        const rowInner = row[1] ?? ''
        const cells = [...rowInner.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)]
        if (cells.length === 0) return null
        return (
          '| ' +
          cells
            .map((cell) =>
              convertInlineHtml(cell[1] ?? '')
                .replace(/\|/g, '\\|')
                .replace(/\n+/g, ' ')
                .trim()
            )
            .join(' | ') +
          ' |'
        )
      })
      .filter((line): line is string => Boolean(line))

    if (lines.length === 0) return ''
    if (lines.length === 1) return `\n\n${lines[0]}\n\n`

    const colCount = (lines[0] ?? '').split('|').length - 2
    const separator = `| ${Array.from({ length: colCount }, () => '---').join(' | ')} |`
    return `\n\n${lines[0]}\n${separator}\n${lines.slice(1).join('\n')}\n\n`
  })
}

function rewriteListTag(html: string, tag: 'ul' | 'ol'): string {
  const pattern = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi')
  return html.replace(pattern, (_, inner: string) => {
    const items = [...inner.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
    if (items.length === 0) return ''
    const lines = items.map((item, index) => {
      const body = convertInlineHtml(item[1] ?? '').replace(/\n+/g, ' ').trim()
      return tag === 'ol' ? `${index + 1}. ${body}` : `- ${body}`
    })
    return `\n\n${lines.join('\n')}\n\n`
  })
}

function rewriteLists(html: string): string {
  let result = rewriteListTag(html, 'ul')
  result = rewriteListTag(result, 'ol')
  return result
}

function rewriteHeadings(html: string): string {
  let result = html
  for (let level = 6; level >= 1; level -= 1) {
    const hashes = '#'.repeat(level)
    result = result.replace(
      new RegExp(`<h${level}[^>]*>([\\s\\S]*?)<\\/h${level}>`, 'gi'),
      (_, inner: string) => `\n\n${hashes} ${convertInlineHtml(inner).replace(/\n+/g, ' ').trim()}\n\n`
    )
  }
  return result
}

function removeEmptyParagraphs(html: string): string {
  return html.replace(/<p[^>]*>\s*<\/p>/gi, '')
}

function rewriteParagraphs(html: string): string {
  return html.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_, inner: string) => {
    if (/<(?:pre|figure|table|ul|ol|blockquote|hr)\b/i.test(inner)) {
      return inner
    }
    const text = convertInlineHtml(inner).trim()
    if (!text) return '\n'
    return `\n\n${text}\n\n`
  })
}

function cleanupRemainingHtml(html: string): string {
  let s = html
  let guard = 0
  while (/<[a-z]/i.test(s) && guard < 16) {
    s = s.replace(/<[^>]+>/g, '')
    guard += 1
  }
  return decodeHtmlEntities(s)
}

function normalizeMarkdown(text: string): string {
  return text
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim()
}

/**
 * Tistory `contents_style` HTML → Emprint markdown.
 *
 * Supported: code blocks (data-ke-language), images/figures, headings, paragraphs,
 * bold/italic/links, blockquotes, ul/ol lists, tables, horizontal rules, opengraph cards.
 */
export function tistoryContentHtmlToMarkdown(
  contentHtml: string,
  srcToMarkdownPath: Map<string, string>
): string {
  if (!contentHtml.trim()) return ''

  let html = contentHtml
  html = rewriteOpenGraphCards(html)
  html = rewritePreBlocks(html)
  html = rewriteFigures(html, srcToMarkdownPath)
  html = rewriteHorizontalRules(html)
  html = rewriteBlockquotes(html)
  html = rewriteTables(html)
  html = rewriteLists(html)
  html = rewriteHeadings(html)
  html = removeEmptyParagraphs(html)
  html = rewriteParagraphs(html)
  html = cleanupRemainingHtml(html)
  return normalizeMarkdown(html)
}

export function buildEmprintPostMarkdown(input: {
  title: string
  description: string
  tags: string[]
  date: string
  draft: boolean
  body: string
}): string {
  // Use gray-matter so titles like `[SSUL] …` are quoted; manual YAML breaks on `[` flow sequences.
  return matter.stringify(input.body, {
    title: input.title,
    description: input.description,
    tags: input.tags,
    createdAt: input.date,
    updatedAt: input.date,
    draft: input.draft
  })
}
