/** Memoir section `props` validation and asset path helpers. */

export const MEMOIR_ASSET_PATH_PATTERN = /^assets\/images\/[^/]+$/i

export interface MemoirContactLink {
  label: string
  url: string
}

export function normalizeMemoirAssetPath(input: string): string {
  const trimmed = input.trim().replace(/^\/+/, '')
  if (!trimmed) return ''
  if (trimmed.startsWith('assets/')) return trimmed
  if (trimmed.startsWith('images/')) return `assets/${trimmed}`
  return `assets/images/${trimmed}`
}

export function memoirAssetPublicSrc(path: string): string {
  const clean = normalizeMemoirAssetPath(path)
  if (!clean) return ''
  return `/${clean}`
}

export function isValidMemoirAssetPath(path: string): boolean {
  const trimmed = path.trim()
  if (!trimmed) return true
  return MEMOIR_ASSET_PATH_PATTERN.test(trimmed.replace(/^\/+/, ''))
}

export function isValidMemoirExternalUrl(url: string): boolean {
  const trimmed = url.trim()
  if (!trimmed) return true
  try {
    const parsed = new URL(trimmed)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' || parsed.protocol === 'mailto:'
  } catch {
    return false
  }
}

function parseMemoirContactLinksRaw(props: Record<string, unknown>): MemoirContactLink[] {
  const raw = props.links
  if (!Array.isArray(raw)) return []
  return raw
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map((item) => ({
      label: typeof item.label === 'string' ? item.label : '',
      url: typeof item.url === 'string' ? item.url : ''
    }))
}

/** Contact links for editors — keeps in-progress empty rows. */
export function parseMemoirContactLinksEditor(props: Record<string, unknown>): MemoirContactLink[] {
  return parseMemoirContactLinksRaw(props)
}

/** Contact links with content only (validation / public site). */
export function parseMemoirContactLinks(props: Record<string, unknown>): MemoirContactLink[] {
  return parseMemoirContactLinksRaw(props).filter((link) => link.label.trim() || link.url.trim())
}

export function serializeMemoirContactLinks(links: MemoirContactLink[]): MemoirContactLink[] {
  return links
    .map((link) => ({ label: link.label.trim(), url: link.url.trim() }))
    .filter((link) => link.label || link.url)
}
