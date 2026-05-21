import { useCallback, useEffect, useState } from 'react'
import { pick } from '@renderer/lib/i18n'
import type { AppLocale, LandingIntroConfig, LandingIntroVariant, SiteProjectKind } from '@emprint/shared'
import {
  DEFAULT_LANDING_INTRO,
  LANDING_INTRO_VARIANT_META,
  normalizeLandingIntroConfig,
  parseColumnThemeFile,
  parseMemoirThemeFile,
  serializeColumnThemeFile,
  serializeMemoirThemeFile
} from '@emprint/shared'
import { Button } from '@renderer/components/ui/button'
import { Card } from '@renderer/components/ui/card'
import { Textarea } from '@renderer/components/ui/textarea'
import { cn } from '@renderer/lib/cn'
import { THEME_JSON_PATH } from './design-workspace-paths'
import { useAppStore } from '@renderer/state/app-store'


/** Design-editable fields; timing values are preserved from theme.json on save. */
function designLandingIntroPatch(
  draft: LandingIntroConfig,
  timing: Pick<LandingIntroConfig, 'typingDelayMs' | 'pauseBeforeFadeMs' | 'fadeDurationMs'>
): LandingIntroConfig {
  return {
    ...timing,
    enabled: draft.enabled,
    variant: draft.variant,
    message: draft.message,
    showOnce: draft.showOnce
  }
}

export function LandingIntroPanel({ locale }: { locale: AppLocale }) {
  const bumpWorkspaceGitRefresh = useAppStore((state) => state.bumpWorkspaceGitRefresh)
  const workspaceConfig = useAppStore((state) => state.workspaceConfig)
  const workspaceResult = useAppStore((state) => state.workspaceResult)
  const siteKind: SiteProjectKind =
    workspaceConfig?.siteProjectKind ?? workspaceResult?.manifest.siteProjectKind ?? 'column'

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState<LandingIntroConfig>({ ...DEFAULT_LANDING_INTRO })
  const [applied, setApplied] = useState<LandingIntroConfig>({ ...DEFAULT_LANDING_INTRO })

  const load = useCallback(async () => {
    const api = window.emprint?.workspaceSrc
    if (!api?.read) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res = await api.read({ path: THEME_JSON_PATH })
      const theme =
        siteKind === 'memoir' ? parseMemoirThemeFile(res.content) : parseColumnThemeFile(res.content)
      const intro = normalizeLandingIntroConfig(theme.landingIntro)
      setDraft(intro)
      setApplied(intro)
    } catch {
      const fallback = { ...DEFAULT_LANDING_INTRO }
      setDraft(fallback)
      setApplied(fallback)
    } finally {
      setLoading(false)
    }
  }, [siteKind])

  useEffect(() => {
    void load()
  }, [load])

  const dirty =
    draft.enabled !== applied.enabled ||
    draft.variant !== applied.variant ||
    draft.message !== applied.message ||
    draft.showOnce !== applied.showOnce

  async function apply() {
    const api = window.emprint?.workspaceSrc
    if (!api?.read || !api?.save) {
      setError(pick(locale, 'Workspace source API unavailable.', '워크스페이스 소스 API를 사용할 수 없습니다.'))
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await api.read({ path: THEME_JSON_PATH })
      let saved: LandingIntroConfig = applied
      const content =
        siteKind === 'memoir'
          ? (() => {
              const theme = parseMemoirThemeFile(res.content)
              const timing = normalizeLandingIntroConfig(theme.landingIntro)
              saved = designLandingIntroPatch(draft, timing)
              theme.landingIntro = saved
              return serializeMemoirThemeFile(theme)
            })()
          : (() => {
              const theme = parseColumnThemeFile(res.content)
              const timing = normalizeLandingIntroConfig(theme.landingIntro)
              saved = designLandingIntroPatch(draft, timing)
              theme.landingIntro = saved
              return serializeColumnThemeFile(theme)
            })()
      await api.save({ path: THEME_JSON_PATH, content })
      bumpWorkspaceGitRefresh()
      setApplied(saved)
      setDraft(saved)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="space-y-4 border-t border-border pt-6">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
          {pick(locale, 'Landing intro', '랜딩 인트로')}
        </h2>
        <p className="mt-1 text-sm text-muted">
          {pick(
            locale,
            'Optional opening sequence before your site content. Applies to all anthology types.',
            '사이트 본문 전에 보여줄 오프닝 시퀀스입니다. 모든 앤솔로지 타입에 적용됩니다.'
          )}
        </p>
      </div>

      {error ? (
        <div className="rounded-md border border-danger/50 bg-dangerBg px-3 py-2 text-xs text-dangerInk">{error}</div>
      ) : null}

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-border accent-accent"
          checked={draft.enabled}
          onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })}
        />
        <span className="text-sm text-ink">{pick(locale, 'Show landing intro', '랜딩 인트로 사용')}</span>
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        {LANDING_INTRO_VARIANT_META.map((item) => {
          const selected = draft.variant === item.id
          return (
            <Card
              key={item.id}
              role="button"
              tabIndex={0}
              onClick={() => setDraft({ ...draft, variant: item.id as LandingIntroVariant })}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setDraft({ ...draft, variant: item.id as LandingIntroVariant })
                }
              }}
              className={cn(
                'cursor-pointer space-y-2 border p-4 transition outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
                selected ? 'border-accent/50 bg-panel2/60' : 'border-border bg-panel hover:border-accent/30',
                !draft.enabled && 'pointer-events-none opacity-50'
              )}
            >
              <div className="text-sm font-semibold text-ink">{locale === 'ko' ? item.labelKo : item.labelEn}</div>
              <p className="text-xs leading-relaxed text-muted">{locale === 'ko' ? item.hintKo : item.hintEn}</p>
            </Card>
          )
        })}
      </div>

      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-ink">{pick(locale, 'Message', '메시지')}</span>
        <Textarea
          rows={2}
          value={draft.message}
          disabled={!draft.enabled}
          onChange={(e) => setDraft({ ...draft, message: e.target.value })}
        />
      </label>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-border accent-accent"
          checked={draft.showOnce}
          disabled={!draft.enabled}
          onChange={(e) => setDraft({ ...draft, showOnce: e.target.checked })}
        />
        <span className="text-sm text-muted">
          {pick(locale, 'Show only once per browser', '브라우저당 한 번만 표시')}
        </span>
      </label>

      <Button type="button" disabled={loading || busy || !dirty} onClick={() => void apply()}>
        {busy
          ? pick(locale, 'Saving…', '저장 중…')
          : dirty
            ? pick(locale, 'Save landing intro', '랜딩 인트로 저장')
            : pick(locale, 'Saved', '저장됨')}
      </Button>
    </section>
  )
}
