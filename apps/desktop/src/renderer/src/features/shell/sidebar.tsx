import type { AppLocale } from '@emprint/shared'
import { cn } from '@renderer/lib/cn'
import { getLocaleMessages, getSectionLabel } from '@renderer/lib/i18n'
import type { SiteProjectKind } from '@emprint/shared'
import type { SidebarSection } from '@renderer/state/app-store'
import type { ReactNode } from 'react'
import { sidebarSectionsForKind } from './workspace-sidebar-sections'
import { Badge } from '@renderer/components/ui/badge'
import emprintLogo from '@renderer/asset/image/emprint-simple-logo.svg'

/** Compact label for a filesystem path (last segment; works with `/` and `\\`). */
function workspacePathFolderName(fullPath: string): string {
  const trimmed = fullPath.trim()
  if (!trimmed) return ''
  const normalized = trimmed.replace(/[/\\]+$/, '').replace(/\\/g, '/')
  const parts = normalized.split('/').filter((p) => p.length > 0)
  const last = parts[parts.length - 1]
  return last ?? normalized
}

interface SidebarProps {
  mode: 'workspace' | 'hub'
  activeSection?: SidebarSection
  locale: AppLocale
  onSelect?: (section: SidebarSection) => void
  workspaceRootDir?: string | undefined
  siteProjectKind?: SiteProjectKind
  githubConnected?: boolean | undefined
  githubLogin?: string | undefined
  children?: ReactNode
  /** Pinned slot rendered at the bottom of the sidebar (e.g. publish button). */
  footer?: ReactNode
}

const columnSections: Array<{ id: SidebarSection; shortcut: string }> = [
  { id: 'posts', shortcut: '1' },
  { id: 'drafts', shortcut: '2' },
  { id: 'assets', shortcut: '3' },
  { id: 'design', shortcut: '4' },
  { id: 'imprint', shortcut: '5' },
  { id: 'settings', shortcut: '6' }
]

const memoirSections: Array<{ id: SidebarSection; shortcut: string }> = [
  { id: 'sections', shortcut: '1' },
  { id: 'assets', shortcut: '2' },
  { id: 'design', shortcut: '3' },
  { id: 'imprint', shortcut: '4' },
  { id: 'settings', shortcut: '5' }
]

const dictionarySections: Array<{ id: SidebarSection; shortcut: string }> = [
  { id: 'index', shortcut: '1' },
  { id: 'knowledge', shortcut: '2' },
  { id: 'drafts', shortcut: '3' },
  { id: 'assets', shortcut: '4' },
  { id: 'design', shortcut: '5' },
  { id: 'imprint', shortcut: '6' },
  { id: 'settings', shortcut: '7' }
]

const fragmentsSections: Array<{ id: SidebarSection; shortcut: string }> = [
  { id: 'artwork', shortcut: '1' },
  { id: 'design', shortcut: '2' },
  { id: 'imprint', shortcut: '3' },
  { id: 'settings', shortcut: '4' }
]

const bookSections: Array<{ id: SidebarSection; shortcut: string }> = [
  { id: 'story', shortcut: '1' },
  { id: 'design', shortcut: '2' },
  { id: 'imprint', shortcut: '3' },
  { id: 'settings', shortcut: '4' }
]

export { sidebarSectionsForKind } from './workspace-sidebar-sections'

export function Sidebar({
  mode,
  activeSection,
  locale,
  onSelect,
  workspaceRootDir,
  siteProjectKind = 'column',
  githubConnected,
  githubLogin,
  children,
  footer
}: SidebarProps) {
  const m = getLocaleMessages(locale)
  const visibleSections =
    siteProjectKind === 'memoir'
      ? memoirSections
      : siteProjectKind === 'dictionary'
        ? dictionarySections
        : siteProjectKind === 'fragments'
          ? fragmentsSections
          : siteProjectKind === 'book'
            ? bookSections
            : columnSections

  return (
    <aside className="flex h-full flex-col border-r border-border bg-panel">
      <div className="sticky top-0 z-30 flex h-12 items-center gap-3 border-b border-border bg-panel px-4">
        <div className="h-7 w-7 overflow-hidden rounded-md border border-border bg-panel2">
          <img
            src={emprintLogo}
            alt="Emprint"
            className="h-full w-full object-contain"
            draggable={false}
          />
        </div>

        <div className="min-w-0 text-sm font-semibold tracking-[0.08em] text-ink">EMPRINT</div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-4 py-4">
        <div className="space-y-4">
          {workspaceRootDir ? (
            <div className="space-y-2 rounded-md border border-border bg-surface px-3 py-2.5">
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted">Root</div>
              <div
                className="truncate font-mono text-[11px] text-ink"
                title={workspaceRootDir}
              >
                {workspacePathFolderName(workspaceRootDir)}
              </div>
              {typeof githubConnected === 'boolean' ? (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Badge>{githubConnected ? (githubLogin ? `GitHub: ${githubLogin}` : 'GitHub connected') : 'GitHub not connected'}</Badge>
                </div>
              ) : null}
            </div>
          ) : null}

          {mode === 'workspace' ? (
            <div className="space-y-2">
              <div className="text-[11px] uppercase tracking-[0.16em] text-muted">{m.shell.sections}</div>
              <nav className="space-y-1.5">
                {visibleSections.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => onSelect?.(section.id)}
                    className={cn(
                      'flex w-full items-start justify-between rounded-md border px-3 py-2 text-left transition duration-150',
                      activeSection === section.id
                        ? 'border-accent/40 bg-panel2'
                        : 'border-transparent hover:border-border hover:bg-panel2/70'
                    )}
                  >
                    <div className="text-sm font-medium text-ink">{getSectionLabel(locale, section.id)}</div>
                    <span className="rounded-sm border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted">
                      {section.shortcut}
                    </span>
                  </button>
                ))}
              </nav>
            </div>
          ) : null}

          {children}
        </div>
      </div>

      {footer ? (
        <div className="border-t border-border bg-panel px-4 py-3">{footer}</div>
      ) : null}
    </aside>
  )
}
