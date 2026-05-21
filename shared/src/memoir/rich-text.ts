/**
 * Renders Memoir section body copy (markdown subset) to safe HTML.
 * Supports paragraphs, single line breaks, bullet/ordered lists, and
 * inline color spans from the desktop markdown editor.
 */

const COLOR_SPAN_RE = /<span\s+style="color:\s*([^"]+)"\s*>([\s\S]*?)<\/span>/gi

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function isAllowedColor(value: string): boolean {
  const color = value.trim()
  return /^#[0-9a-fA-F]{3,8}$/.test(color) || /^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$/.test(color)
}

function isBulletListLine(line: string): boolean {
  return /^\s*[-*+]\s+/.test(line)
}

function isOrderedListLine(line: string): boolean {
  return /^\s*\d+\.\s+/.test(line)
}

function stripBulletPrefix(line: string): string {
  return line.replace(/^\s*[-*+]\s+/, '')
}

function stripOrderedPrefix(line: string): string {
  return line.replace(/^\s*\d+\.\s+/, '')
}

/** Inline text: escape HTML, preserving validated color spans from TipTap. */
export function renderMemoirRichInline(source: string): string {
  if (!source) return ''
  let out = ''
  let lastIndex = 0
  COLOR_SPAN_RE.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = COLOR_SPAN_RE.exec(source)) !== null) {
    out += escapeHtml(source.slice(lastIndex, match.index))
    const color = match[1] ?? ''
    const inner = match[2] ?? ''
    if (isAllowedColor(color)) {
      out += `<span style="color: ${color.trim()}">${renderMemoirRichInline(inner)}</span>`
    } else {
      out += escapeHtml(match[0])
    }
    lastIndex = match.index + match[0].length
  }
  out += escapeHtml(source.slice(lastIndex))
  return out
}

function renderBlock(block: string): string {
  const lines = block.split('\n')
  if (lines.length > 0 && lines.every(isBulletListLine)) {
    const items = lines
      .map((line) => `<li>${renderMemoirRichInline(stripBulletPrefix(line))}</li>`)
      .join('')
    return `<ul class="ep-memoir-RichText-list">${items}</ul>`
  }
  if (lines.length > 0 && lines.every(isOrderedListLine)) {
    const items = lines
      .map((line) => `<li>${renderMemoirRichInline(stripOrderedPrefix(line))}</li>`)
      .join('')
    return `<ol class="ep-memoir-RichText-list">${items}</ol>`
  }
  const inner = lines.map((line) => renderMemoirRichInline(line)).join('<br />')
  return `<p class="ep-memoir-RichText-p">${inner}</p>`
}

/** Block-level rich text (paragraphs, lists, line breaks). */
export function renderMemoirRichText(source: string): string {
  const trimmed = source.trim()
  if (!trimmed) return ''
  const normalized = source.replace(/\r\n/g, '\n')
  const blocks = normalized.split(/\n{2,}/).filter((block) => block.trim())
  return blocks.map((block) => renderBlock(block.trimEnd())).join('\n')
}
