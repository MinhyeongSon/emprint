import type { SiteProjectKind } from '@emprint/shared'
import type { SidebarSection } from '@renderer/state/app-store'

export const COLUMN_SIDEBAR_SECTIONS: SidebarSection[] = [
  'posts',
  'drafts',
  'assets',
  'design',
  'imprint',
  'settings'
]

export const MEMOIR_SIDEBAR_SECTIONS: SidebarSection[] = [
  'sections',
  'assets',
  'design',
  'imprint',
  'settings'
]

export const DICTIONARY_SIDEBAR_SECTIONS: SidebarSection[] = [
  'index',
  'knowledge',
  'drafts',
  'assets',
  'design',
  'imprint',
  'settings'
]

export function sidebarSectionsForKind(kind: SiteProjectKind): SidebarSection[] {
  if (kind === 'memoir') return MEMOIR_SIDEBAR_SECTIONS
  if (kind === 'dictionary') return DICTIONARY_SIDEBAR_SECTIONS
  return COLUMN_SIDEBAR_SECTIONS
}
