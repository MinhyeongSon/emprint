import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ExternalLink, Loader2, Sparkles } from 'lucide-react'
import { pick } from '@renderer/lib/i18n'
import type { AppLocale, SiteDevServerState } from '@emprint/shared'
import { Button } from '@renderer/components/ui/button'
import { Card } from '@renderer/components/ui/card'
import { cn } from '@renderer/lib/cn'
import { CodeModePanel } from './code-mode-panel'
import {
  openSiteDevPreview,
  pollSiteDevStatus,
  SITE_DEV_PREVIEW_URL,
  stopSiteDevPreview
} from './design-dev-preview'
import { DesignPreviewProgress } from './design-preview-progress'
import { DesignAiPromptDialog } from './design-ai-prompt-dialog'
import { TemplateModePanel } from './template-mode-panel'
import { useAppStore } from '@renderer/state/app-store'
import { anthologyHasDeploySearch, DeploySearchHint } from '@renderer/components/deploy-search-hint'


export type DesignUiMode = 'template' | 'code'

const MODE_STORAGE = 'emprint-design-ui-mode'

function readStoredMode(): DesignUiMode {
  try {
    const v = sessionStorage.getItem(MODE_STORAGE)
    if (v === 'template' || v === 'code') return v
    if (v === 'block') return 'template'
  } catch {
    /* ignore */
  }
  return 'template'
}

export function DesignSurface({ locale }: { locale: AppLocale }) {
  const [uiMode, setUiMode] = useState<DesignUiMode>(() => readStoredMode())
  const [pendingMode, setPendingMode] = useState<DesignUiMode | null>(null)
  const [previewBusy, setPreviewBusy] = useState(false)
  const [previewState, setPreviewState] = useState<SiteDevServerState | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [aiPromptOpen, setAiPromptOpen] = useState(false)
  const workspaceConfig = useAppStore((state) => state.workspaceConfig)
  const workspaceResult = useAppStore((state) => state.workspaceResult)
  const siteKind =
    workspaceConfig?.siteProjectKind ?? workspaceResult?.manifest.siteProjectKind ?? 'column'
  const templateOnly = siteKind === 'book'

  useEffect(() => {
    if (templateOnly && uiMode === 'code') {
      setUiMode('template')
    }
  }, [templateOnly, uiMode])

  useEffect(() => {
    try {
      sessionStorage.setItem(MODE_STORAGE, uiMode)
    } catch {
      /* ignore */
    }
  }, [uiMode])

  useEffect(() => {
    return () => {
      void stopSiteDevPreview()
    }
  }, [])

  function requestModeChange(next: DesignUiMode) {
    if (next === uiMode) return
    setPendingMode(next)
  }

  async function confirmModeChange() {
    if (!pendingMode) return
    await stopSiteDevPreview()
    setUiMode(pendingMode)
    setPendingMode(null)
  }

  async function handleOpenPreview() {
    setPreviewBusy(true)
    setPreviewError(null)
    setPreviewState({
      status: 'starting',
      url: SITE_DEV_PREVIEW_URL,
      phase: 'installing',
      progress: 8
    })

    const poll = setInterval(() => {
      void pollSiteDevStatus().then((state) => {
        if (state.status !== 'stopped' || state.phase) {
          setPreviewState(state)
        }
      })
    }, 400)

    try {
      const state = await openSiteDevPreview()
      setPreviewState(state)
      if (state.status === 'error') {
        setPreviewError(
          state.message ?? pick(locale, 'Could not start preview.', '미리보기를 시작하지 못했습니다.')
        )
      }
    } catch (caught) {
      setPreviewError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      clearInterval(poll)
      setPreviewBusy(false)
      setPreviewState(null)
    }
  }

  const modeTabs: { id: DesignUiMode; label: string }[] = templateOnly
    ? [{ id: 'template', label: pick(locale, 'Template', '템플릿') }]
    : [
        { id: 'template', label: pick(locale, 'Template', '템플릿') },
        { id: 'code', label: pick(locale, 'Code', '코드') }
      ]

  return (
    <div
      className={cn(
        'flex h-[calc(100svh-2.5rem)] max-h-[calc(100svh-2.5rem)] min-h-[360px] flex-col bg-base',
        uiMode === 'code' && 'overflow-hidden'
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-panel px-4 py-2">
        <div className="flex flex-wrap items-center gap-2">
          {modeTabs.map((tab) => (
            <Button
              key={tab.id}
              type="button"
              variant={uiMode === tab.id ? 'primary' : 'outline'}
              className={cn('h-8', uiMode === tab.id && 'shadow-sm')}
              onClick={() => requestModeChange(tab.id)}
            >
              {tab.label}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-8 gap-1.5 text-xs"
            onClick={() => setAiPromptOpen(true)}
          >
            <Sparkles className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            {pick(locale, 'AI prompt', 'AI 프롬프트')}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-8 gap-1.5"
            disabled={previewBusy}
            onClick={() => void handleOpenPreview()}
            title={SITE_DEV_PREVIEW_URL}
          >
            {previewBusy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} aria-hidden />
            ) : (
              <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            )}
            {previewBusy
              ? pick(locale, 'Starting…', '시작 중…')
              : pick(locale, 'Preview', '미리보기')}
          </Button>
        </div>
      </div>

      {previewBusy && previewState ? <DesignPreviewProgress locale={locale} state={previewState} /> : null}

      {previewError ? (
        <div className="border-b border-danger/40 bg-dangerBg px-4 py-2 text-xs text-dangerInk">{previewError}</div>
      ) : null}

      {anthologyHasDeploySearch(siteKind) ? (
        <DeploySearchHint locale={locale} context="design" className="mx-4 mt-3" />
      ) : null}

      <div
        className={cn(
          'min-h-0 flex-1',
          uiMode === 'code' ? 'overflow-hidden' : 'overflow-auto px-4 py-4'
        )}
      >
        {uiMode === 'template' ? <TemplateModePanel locale={locale} /> : <CodeModePanel locale={locale} />}
      </div>

      {pendingMode
        ? createPortal(
            <div
              role="dialog"
              aria-modal="true"
              className="emprint-scrim titlebar-nodrag fixed inset-0 z-[80] flex items-start justify-center px-4 py-20 backdrop-blur-[2px]"
              onClick={() => setPendingMode(null)}
            >
              <Card
                className="w-full max-w-md space-y-4 border border-border bg-panel p-5 shadow-lg"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-sm font-semibold text-ink">
                  {pick(locale, 'Switch design mode?', '디자인 모드를 바꿀까요?')}
                </div>
                <p className="text-sm leading-relaxed text-muted">
                  {pick(
                    locale,
                    'Changing the mode can discard or reset customizations in other modes. A running preview will be stopped. After you continue, this mode loads its default starting point.',
                    '모드를 바꾸면 다른 모드에서 하던 커스터마이징이 사라지거나 초기화될 수 있습니다. 실행 중인 미리보기는 종료됩니다. 계속하면 이 모드의 기본 상태로 맞춥니다.'
                  )}
                </p>
                <div className="flex justify-end gap-2 border-t border-border pt-3">
                  <Button type="button" variant="ghost" className="h-8" onClick={() => setPendingMode(null)}>
                    {pick(locale, 'Cancel', '취소')}
                  </Button>
                  <Button type="button" className="h-8" onClick={() => void confirmModeChange()}>
                    {pick(locale, 'Continue', '계속')}
                  </Button>
                </div>
              </Card>
            </div>,
            document.body
          )
        : null}

      {aiPromptOpen ? (
        <DesignAiPromptDialog
          locale={locale}
          workspaceConfig={workspaceConfig}
          onClose={() => setAiPromptOpen(false)}
        />
      ) : null}
    </div>
  )
}
