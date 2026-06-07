/** Fragments anthology — artwork on disk + manifest ordering. */

export const MAX_FRAGMENTS_ARTWORK_COUNT = 50

export const ARTWORK_MANIFEST_VERSION = 1 as const

export interface ArtworkManifestItem {
  id: string
  /** Workspace-relative POSIX path, e.g. `artwork/sunset.jpg` */
  path: string
  title: string
  caption?: string
  /** Optional creation year shown on the public shelf / lightbox. */
  year?: number
  /** Optional medium label, e.g. "Oil on canvas". */
  medium?: string
  /** Optional in-app filter tags (not exposed as public `/tags/` routes). */
  tags?: string[]
  addedAt: string
  sort: number
}

export interface ArtworkManifestFile {
  version: typeof ARTWORK_MANIFEST_VERSION
  /** Optional flat anthology album title (single album for MVP). */
  album?: string
  items: ArtworkManifestItem[]
}

export interface ArtworkImageInfo {
  id: string
  path: string
  name: string
  title: string
  caption?: string
  year?: number
  medium?: string
  tags?: string[]
  size: number
  mimeType: 'image/jpeg'
  modifiedAt: string
  addedAt: string
  sort: number
}

export interface ArtworkListResult {
  album?: string
  items: ArtworkImageInfo[]
}

export interface ArtworkSaveInput {
  fileName: string
  data: Uint8Array
  mimeType: string
  title?: string
  caption?: string
}

export interface ArtworkUpdateInput {
  id: string
  title?: string
  caption?: string
  year?: number | null
  medium?: string
  tags?: string[]
}

export interface ArtworkAlbumUpdateInput {
  album?: string
}

export interface ArtworkReorderInput {
  orderedIds: string[]
}

export interface ArtworkDeleteInput {
  id: string
}

export function normalizeArtworkTags(tags: string[]): string[] {
  return Array.from(new Set(tags.map((t) => t.trim()).filter(Boolean)))
}

/** Parse a comma- or newline-separated tag draft into normalized tags. */
export function parseArtworkTagsInput(raw: string): string[] {
  return normalizeArtworkTags(
    raw
      .split(/[,;\n]+/)
      .map((part) => part.trim())
      .filter(Boolean)
  )
}

export function formatArtworkMetaLine(input: { year?: number; medium?: string }): string {
  const parts: string[] = []
  if (input.year != null && Number.isFinite(input.year)) parts.push(String(input.year))
  const medium = input.medium?.trim()
  if (medium) parts.push(medium)
  return parts.join(' · ')
}
