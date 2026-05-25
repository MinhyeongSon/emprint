/**
 * Publication slug — stable folder + GitHub repo name, distinct from display `title` and `siteProjectKind`.
 */

const SLUG_FALLBACK = 'emprint-publication'

/** Unicode-aware slug for local paths and GitHub repo names. */
export function slugifyPublicationSlug(value: string): string {
  return (
    value
      .normalize('NFKC')
      .trim()
      .toLowerCase()
      .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
      .replace(/^-+|-+$/g, '') || SLUG_FALLBACK
  )
}

/** Derive a default slug from the publication display title. */
export function publicationSlugFromTitle(title: string): string {
  return slugifyPublicationSlug(title)
}

/** Whether `slug` is safe for folder names and GitHub repo names. */
export function isValidPublicationSlug(slug: string): boolean {
  if (!slug || slug.length > 96) return false
  return /^[\p{Letter}\p{Number}](?:[\p{Letter}\p{Number}-]*[\p{Letter}\p{Number}])?$/u.test(slug)
}

export function normalizePublicationSlug(value: unknown, fallbackTitle?: string): string {
  if (typeof value === 'string' && value.trim()) {
    const slug = slugifyPublicationSlug(value)
    if (isValidPublicationSlug(slug)) return slug
  }
  if (fallbackTitle?.trim()) {
    return publicationSlugFromTitle(fallbackTitle)
  }
  return SLUG_FALLBACK
}

/** Resolve slug stored on disk (supports manifests before `publicationSlug` existed). */
export function resolveManifestPublicationSlug(manifest: {
  publicationSlug?: string
  name?: string
  title?: string
}): string {
  const explicit = manifest.publicationSlug?.trim()
  if (explicit && isValidPublicationSlug(slugifyPublicationSlug(explicit))) {
    return slugifyPublicationSlug(explicit)
  }
  const legacyName = manifest.name?.trim()
  if (legacyName && isValidPublicationSlug(slugifyPublicationSlug(legacyName))) {
    return slugifyPublicationSlug(legacyName)
  }
  return publicationSlugFromTitle(manifest.title ?? '')
}
