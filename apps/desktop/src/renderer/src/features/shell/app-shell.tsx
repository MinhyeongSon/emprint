import { useCallback, useEffect, useState } from 'react'
import { Command, Hash } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import {
  getLocaleMessages,
} from '@renderer/lib/i18n'
import { Sidebar } from './sidebar'
import { PublishButton } from './publish-button'
import { PublishDialog } from './publish-dialog'
import { useAppStore, type SidebarSection } from '@renderer/state/app-store'
import { PostsSurface } from '@renderer/features/posts/posts-surface'
import { ImplementSurface } from '@renderer/features/implement/implement-surface'
import { AssetsSurface } from '@renderer/features/assets/assets-surface'
import { ImprintSurface } from '@renderer/features/imprint/imprint-surface'

const sectionOrder: SidebarSection[] = ['posts', 'drafts', 'assets', 'implement', 'imprint', 'settings']

export function AppShell() {
  const locale = useAppStore((state) => state.locale)
  const activeSection = useAppStore((state) => state.activeSection)
  const setActiveSection = useAppStore((state) => state.setActiveSection)
  const workspaceConfig = useAppStore((state) => state.workspaceConfig)
  const workspaceResult = useAppStore((state) => state.workspaceResult)
  const workspaceRootDir = useAppStore((state) => state.workspaceRootDir)
  const githubConnected = useAppStore((state) => state.githubConnected)
  const githubLogin = useAppStore((state) => state.githubLogin)
  // Block publish while the editor has uncommitted in-memory edits so we
  // never race a save() write against `git add`/`git commit`.
  const activeDocumentDirty = useAppStore((state) => state.activeDocumentDirty)
  const m = getLocaleMessages(locale)

  const [publishOpen, setPublishOpen] = useState(false)
  // Bumped after the publish dialog reports a successful publish so the
  // sidebar button and the Imprint surface know to refetch.
  const [gitRefreshToken, setGitRefreshToken] = useState(0)

  const handlePublished = useCallback(() => {
    setGitRefreshToken((n) => n + 1)
  }, [])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable)

      if (typing || event.metaKey || event.ctrlKey || event.altKey) {
        return
      }

      const shortcutIndex = Number(event.key) - 1

      if (shortcutIndex >= 0 && shortcutIndex < sectionOrder.length) {
        setActiveSection(sectionOrder[shortcutIndex] as SidebarSection)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setActiveSection])

  if (!workspaceConfig || !workspaceResult) {
    return null
  }

  return (
    <div className="grid h-full grid-cols-1 bg-base lg:grid-cols-[232px_minmax(0,1fr)]">
      <Sidebar
        mode="workspace"
        activeSection={activeSection}
        locale={locale}
        onSelect={setActiveSection}
        {...(workspaceRootDir ? { workspaceRootDir } : {})}
        {...(typeof githubConnected === 'boolean' ? { githubConnected } : {})}
        {...(githubLogin ? { githubLogin } : {})}
        footer={
          <PublishButton
            locale={locale}
            refreshToken={gitRefreshToken}
            blocked={activeDocumentDirty}
            onClick={() => setPublishOpen(true)}
          />
        }
      />

      <main className="min-h-0 overflow-auto bg-base">
        {activeSection === 'posts' ? (
          <PostsSurface locale={locale} section="posts" />
        ) : activeSection === 'drafts' ? (
          <PostsSurface locale={locale} section="drafts" />
        ) : activeSection === 'assets' ? (
          <AssetsSurface locale={locale} />
        ) : activeSection === 'implement' ? (
          <ImplementSurface locale={locale} />
        ) : activeSection === 'imprint' ? (
          <ImprintSurface locale={locale} refreshToken={gitRefreshToken} />
        ) : (
          <div className="mx-auto w-full max-w-[980px] px-4 py-12 lg:px-10">
            <div className="space-y-6">
              <div>
                <div className="text-[11px] uppercase tracking-[0.16em] text-muted">Settings</div>
                <div className="mt-2 text-lg font-semibold tracking-[-0.02em] text-ink">Studio</div>
              </div>

              <div className="rounded-lg border border-border bg-surface p-4">
                <div className="text-sm font-medium text-ink">Keyboard</div>
                <div className="mt-3 grid gap-2 text-sm text-muted">
                  <div className="flex items-center justify-between rounded-md border border-border/70 bg-panel px-3 py-2">
                    <span className="inline-flex items-center gap-2 text-ink" title="Command palette">
                      <Command className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
                      <span className="sr-only">Open command palette</span>
                    </span>
                    <span className="rounded-sm border border-border px-1.5 py-0.5 font-mono text-[10px]">Ctrl K</span>
                  </div>
                  <div className="flex items-center justify-between rounded-md border border-border/70 bg-panel px-3 py-2">
                    <span className="inline-flex items-center gap-2 text-ink" title="Jump sections">
                      <Hash className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
                      <span className="sr-only">Jump sections</span>
                    </span>
                    <span className="rounded-sm border border-border px-1.5 py-0.5 font-mono text-[10px]">1–6</span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-surface p-4">
                <div className="text-sm font-medium text-ink">Data</div>
                <div className="mt-2 text-sm text-muted">Your content lives in your workspace folder.</div>
              </div>
            </div>
          </div>
        )}
      </main>

      <PublishDialog
        open={publishOpen}
        locale={locale}
        onClose={() => setPublishOpen(false)}
        onPublished={handlePublished}
      />
    </div>
  )
}
