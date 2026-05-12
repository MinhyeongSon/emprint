import type { AppLocale } from '@emprint/shared'
import { cn } from '@renderer/lib/cn'
import { getLocaleMessages, getSectionLabel } from '@renderer/lib/i18n'
import type { SidebarSection } from '@renderer/state/app-store'
import type { ReactNode } from 'react'
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
  githubConnected?: boolean | undefined
  githubLogin?: string | undefined
  children?: ReactNode
  /** Pinned slot rendered at the bottom of the sidebar (e.g. publish button). */
  footer?: ReactNode
}

const sections: Array<{ id: SidebarSection; shortcut: string }> = [
  { id: 'posts', shortcut: '1' },
  { id: 'drafts', shortcut: '2' },
  { id: 'assets', shortcut: '3' },
  { id: 'implement', shortcut: '4' },
  { id: 'imprint', shortcut: '5' },
  { id: 'settings', shortcut: '6' }
]

export function Sidebar({
  mode,
  activeSection,
  locale,
  onSelect,
  workspaceRootDir,
  githubConnected,
  githubLogin,
  children,
  footer
}: SidebarProps) {
  const m = getLocaleMessages(locale)

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
                {sections.map((section) => (
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
