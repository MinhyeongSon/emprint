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

export function sidebarSectionsForKind(kind: SiteProjectKind): SidebarSection[] {
  return kind === 'memoir' ? MEMOIR_SIDEBAR_SECTIONS : COLUMN_SIDEBAR_SECTIONS
}
