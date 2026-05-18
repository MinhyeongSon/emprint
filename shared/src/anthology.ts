/**
 * Anthology kinds and per-format content layout.
 *
 * Shared surfaces (Assets, Design, Imprint, Settings) are anthology-agnostic.
 * Content authoring roots differ by semantic format (Column posts vs Memoir sections).
 */

import type { SiteProjectKind } from './types'

export type AnthologyKind = SiteProjectKind

/** Machine-readable theme contract version shared by all anthologies. */
export const ANTHOLOGY_THEME_CONTRACT_VERSION = 1 as const

export interface AnthologyContentLayout {
  kind: AnthologyKind
  /** Top-level folders owned by the authoring UI (not Design → Code). */
  contentTopLevelDirs: readonly string[]
  /** Path to Astro `src/content.config.ts` relative to workspace root. */
  contentConfigPath: string
  /** Glob loader `base` in content.config — must stay stable for IPC guards. */
  contentLoaderBase: string
  /** Astro collection id in content.config.ts */
  contentCollectionId: string
}

const COLUMN_LAYOUT: AnthologyContentLayout = {
  kind: 'column',
  contentTopLevelDirs: ['posts', 'drafts', 'assets', '.workspace'],
  contentConfigPath: 'src/content.config.ts',
  contentLoaderBase: './posts',
  contentCollectionId: 'posts'
}

const MEMOIR_LAYOUT: AnthologyContentLayout = {
  kind: 'memoir',
  contentTopLevelDirs: ['sections', 'assets', '.workspace'],
  contentConfigPath: 'src/content.config.ts',
  contentLoaderBase: './sections',
  contentCollectionId: 'sections'
}

const LAYOUT_BY_KIND: Record<AnthologyKind, AnthologyContentLayout> = {
  column: COLUMN_LAYOUT,
  memoir: MEMOIR_LAYOUT
}

export function getAnthologyContentLayout(kind: AnthologyKind): AnthologyContentLayout {
  return LAYOUT_BY_KIND[kind]
}

export function anthologyClassPrefix(kind: AnthologyKind): `ep-${AnthologyKind}` {
  return `ep-${kind}`
}
