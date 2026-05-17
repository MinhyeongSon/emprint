import { useEffect, useMemo, useState } from 'react'
import { AppShell } from '@renderer/features/shell/app-shell'
import { WorkspaceHub } from '@renderer/features/hub/workspace-hub'
import { WorkspaceWizard } from '@renderer/features/wizard/workspace-wizard'
import type { AppLocale } from '@emprint/shared'
import { useAppStore, type AppTheme } from '@renderer/state/app-store'
import { Titlebar } from '@renderer/components/titlebar/titlebar'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import { Card } from '@renderer/components/ui/card'
import {
  Command,
  FolderOpen,
  LayoutGrid,
  Coffee,
  Loader2,
  LogOut,
  Moon,
  Sun,
  X
} from 'lucide-react'
import { getSectionLabel } from '@renderer/lib/i18n'
import { CommandPalette, type CommandPaletteItem } from '@renderer/features/shell/command-palette'
import { HubRecoveryOverlay } from '@renderer/features/hub/hub-recovery-overlay'
import { HubRecoveryRunner } from '@renderer/features/hub/hub-recovery-runner'

export function App() {
  const locale = useAppStore((state) => state.locale)
  const setLocale = useAppStore((state) => state.setLocale)
  const theme = useAppStore((state) => state.theme)
  const setTheme = useAppStore((state) => state.setTheme)
  const mode = useAppStore((state) => state.mode)
  const setRuntimeInfo = useAppStore((state) => state.setRuntimeInfo)
  const enterHub = useAppStore((state) => state.enterHub)
  const returnToWizard = useAppStore((state) => state.returnToWizard)
  const activeSection = useAppStore((state) => state.activeSection)
  const workspaceResult = useAppStore((state) => state.workspaceResult)
  const workspaceConfig = useAppStore((state) => state.workspaceConfig)
  const workspaceRootDir = useAppStore((state) => state.workspaceRootDir)
  const setWorkspaceRootDir = useAppStore((state) => state.setWorkspaceRootDir)
  const githubConnected = useAppStore((state) => state.githubConnected)
  const githubLogin = useAppStore((state) => state.githubLogin)
  const setGithubSession = useAppStore((state) => state.setGithubSession)

  const [paletteOpen, setPaletteOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [githubLogoutBusy, setGithubLogoutBusy] = useState(false)

  useEffect(() => {
    void window.emprint.system
      .getRuntimeInfo()
      .then((runtimeInfo) => {
        setRuntimeInfo(runtimeInfo)
      })
      .catch(() => {
        // Keep the shell usable even if diagnostics are unavailable.
      })
  }, [setRuntimeInfo])

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable)

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setPaletteOpen((open) => !open)
        return
      }

      if (event.key === 'Escape') {
        setPaletteOpen(false)
        setSettingsOpen(false)
        return
      }

      if (typing || event.metaKey || event.ctrlKey || event.altKey) {
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    function onOpenCommandPalette() {
      setPaletteOpen(true)
    }
    window.addEventListener('emprint:open-command-palette', onOpenCommandPalette)
    return () => window.removeEventListener('emprint:open-command-palette', onOpenCommandPalette)
  }, [])

  useEffect(() => {
    if (!settingsOpen) return
    const api = window.emprint?.github
    if (!api?.authStatus) return
    let alive = true

    void api
      .authStatus()
      .then((status) => {
        if (!alive) return
        setGithubSession({ connected: status.connected, login: status.login })
      })
      .catch(() => {})

    return () => {
      alive = false
    }
  }, [settingsOpen, setGithubSession])

  useEffect(() => {
    const unsubscribe = window.emprint?.app?.onGithubSessionCleared?.(() => {
      setGithubSession({ connected: false, login: undefined })
      returnToWizard()
    })
    return () => unsubscribe?.()
  }, [returnToWizard, setGithubSession])

  const center =
    mode === 'workspace' ? (
      <Badge>{getSectionLabel(locale, activeSection)}</Badge>
    ) : mode === 'hub' ? (
      <Badge>Hub</Badge>
    ) : (
      <Badge>Setup</Badge>
    )

  const themeOptions: { value: AppTheme; label: string; Icon: typeof Moon }[] = [
    { value: 'dark', label: 'Dark', Icon: Moon },
    { value: 'light', label: 'Light', Icon: Sun },
    { value: 'warm', label: 'Warm', Icon: Coffee }
  ]

  const localeOptions: { value: AppLocale; label: string }[] = [
    { value: 'en', label: 'English' },
    { value: 'ko', label: '한국어' }
  ]

  const paletteItems: CommandPaletteItem[] = useMemo(() => {
    const items: CommandPaletteItem[] = [
      {
        id: 'app:settings',
        label: 'Emprint Settings',
        hint: 'Open app settings',
        meta: 'App',
        onSelect: () => setSettingsOpen(true)
      }
    ]

    if (mode === 'workspace') {
      items.unshift({
        id: 'nav:hub',
        label: 'Go to Hub',
        hint: locale === 'ko' ? '앤솔로지 허브로 돌아가기' : 'Back to anthology hub',
        meta: 'Nav',
        onSelect: () => enterHub()
      })
    }

    return items
  }, [enterHub, locale, mode])

  const right = (
    <>
      {mode === 'workspace' ? (
        <Button
          variant="outline"
          type="button"
          className="h-7 w-7 shrink-0 p-0"
          aria-label="Go to Hub"
          title="Hub"
          onClick={enterHub}
        >
          <LayoutGrid className="h-3.5 w-3.5" strokeWidth={2} />
        </Button>
      ) : null}
      <button
        type="button"
        onClick={() => setPaletteOpen(true)}
        aria-label="Command palette"
        title="Command palette (⌘K / Ctrl+K)"
        className="titlebar-nodrag hidden h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-panel2 p-0 text-muted transition hover:border-accent/40 hover:text-ink lg:inline-flex"
      >
        <Command className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
    </>
  )

  // Safety: if something put us into workspace mode without mounted workspace, go back to hub.
  useEffect(() => {
    if (mode !== 'workspace') return
    if (workspaceConfig && workspaceResult) return
    enterHub()
  }, [enterHub, mode, workspaceConfig, workspaceResult])

  return (
    <>
      <HubRecoveryRunner />
      {/* Match Titlebar `h-10` (2.5rem / 40px); a taller row leaves a visible gap under the bar */}
      <div className="grid h-screen grid-rows-[2.5rem_minmax(0,1fr)] bg-base">
        <Titlebar
          center={center}
          right={right}
          chrome={typeof window !== 'undefined' && window.emprint?.env?.platform === 'darwin' ? 'mac' : 'windows'}
        />
        <div className="min-h-0 overflow-hidden">
          {mode === 'wizard' ? <WorkspaceWizard /> : mode === 'hub' ? <WorkspaceHub /> : <AppShell />}
        </div>
      </div>

      <CommandPalette items={paletteItems} locale={locale} onClose={() => setPaletteOpen(false)} open={paletteOpen} />

      {settingsOpen ? (
        <div
          className="emprint-scrim fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overscroll-contain px-4 pb-6 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-[2px]"
          onClick={() => setSettingsOpen(false)}
        >
          <div
            className="my-4 w-full max-w-2xl shrink-0 sm:my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <Card className="flex max-h-[min(85vh,calc(100dvh-2.5rem))] flex-col overflow-hidden">
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
                <div className="text-sm font-semibold text-ink">Emprint Settings</div>
                <Button
                  variant="ghost"
                  type="button"
                  className="h-8 w-8 shrink-0 p-0"
                  aria-label="Close settings"
                  title="Close"
                  onClick={() => setSettingsOpen(false)}
                >
                  <X className="h-4 w-4" strokeWidth={2} />
                </Button>
              </div>

              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
              <div className="space-y-2">
                <div className="text-[11px] uppercase tracking-[0.16em] text-muted">
                  {locale === 'ko' ? '언어' : 'Language'}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {localeOptions.map(({ value, label }) => (
                    <Button
                      key={value}
                      variant={locale === value ? 'primary' : 'outline'}
                      type="button"
                      className="h-8 px-2.5"
                      aria-pressed={locale === value}
                      onClick={() => setLocale(value)}
                    >
                      <span className="text-xs">{label}</span>
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-[11px] uppercase tracking-[0.16em] text-muted">Theme</div>
                <div className="flex flex-wrap items-center gap-2">
                  {themeOptions.map(({ value, label, Icon }) => (
                    <Button
                      key={value}
                      variant={theme === value ? 'primary' : 'outline'}
                      type="button"
                      className="h-8 gap-1.5 px-2.5"
                      aria-pressed={theme === value}
                      aria-label={`${label} theme`}
                      title={label}
                      onClick={() => setTheme(value)}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
                      <span className="text-xs">{label}</span>
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-[11px] uppercase tracking-[0.16em] text-muted">Workspace root folder</div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    type="button"
                    className="h-8 w-8 shrink-0 p-0"
                    aria-label="Choose workspace root folder"
                    title="Choose folder"
                    onClick={async () => {
                      const result = await window.emprint.system.selectDirectory()
                      if (result?.directory) setWorkspaceRootDir(result.directory)
                    }}
                  >
                    <FolderOpen className="h-4 w-4" strokeWidth={2} />
                  </Button>
                  <div className="min-w-0 truncate font-mono text-[11px] text-muted">{workspaceRootDir || 'Not set'}</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-[11px] uppercase tracking-[0.16em] text-muted">GitHub</div>
                <div className="flex flex-col gap-3 rounded-md border border-border bg-panel px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 text-sm text-ink">
                    {githubConnected
                      ? locale === 'ko'
                        ? `연결됨${githubLogin ? ` (${githubLogin})` : ''}`
                        : `Connected${githubLogin ? `: ${githubLogin}` : ''}`
                      : locale === 'ko'
                        ? '연결되지 않음'
                        : 'Not connected'}
                  </div>
                  {githubConnected ? (
                    <Button
                      variant="outline"
                      type="button"
                      disabled={githubLogoutBusy}
                      className="h-8 shrink-0 gap-1.5 self-start px-3 sm:self-auto"
                      aria-label={locale === 'ko' ? 'GitHub 로그아웃' : 'Log out of GitHub'}
                      title={locale === 'ko' ? 'GitHub 로그아웃' : 'Log out of GitHub'}
                      onClick={async () => {
                        setGithubLogoutBusy(true)
                        try {
                          await window.emprint.github.logout()
                          setGithubSession({ connected: false, login: undefined })
                          setSettingsOpen(false)
                          returnToWizard()
                        } finally {
                          setGithubLogoutBusy(false)
                        }
                      }}
                    >
                      {githubLogoutBusy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} aria-hidden />
                      ) : (
                        <LogOut className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
                      )}
                      <span className="text-xs">{locale === 'ko' ? '로그아웃' : 'Log out'}</span>
                    </Button>
                  ) : null}
                </div>
                {!githubConnected ? (
                  <p className="text-xs leading-relaxed text-muted">
                    {locale === 'ko'
                      ? 'GitHub 연결은 설정 마법사(Wizard)에서 진행합니다.'
                      : 'Connect GitHub from the setup wizard.'}
                  </p>
                ) : null}
              </div>
              </div>
            </Card>
          </div>
        </div>
      ) : null}

      <HubRecoveryOverlay locale={locale} />
    </>
  )
}
