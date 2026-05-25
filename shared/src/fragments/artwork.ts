/** Fragments anthology — artwork on disk + manifest ordering. */

export const MAX_FRAGMENTS_ARTWORK_COUNT = 50

export const ARTWORK_MANIFEST_VERSION = 1 as const

export interface ArtworkManifestItem {
  id: string
  /** Workspace-relative POSIX path, e.g. `artwork/sunset.jpg` */
  path: string
  title: string
  caption?: string
  addedAt: string
  sort: number
}

export interface ArtworkManifestFile {
  version: typeof ARTWORK_MANIFEST_VERSION
  items: ArtworkManifestItem[]
}

export interface ArtworkImageInfo {
  id: string
  path: string
  name: string
  title: string
  caption?: string
  size: number
  mimeType: 'image/jpeg'
  modifiedAt: string
  addedAt: string
  sort: number
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
}

export interface ArtworkReorderInput {
  orderedIds: string[]
}

export interface ArtworkDeleteInput {
  id: string
}
