import { useCallback, useEffect, useState } from 'react'
import type { AppLocale } from '@emprint/shared'
import { Button } from '@renderer/components/ui/button'
import { Card } from '@renderer/components/ui/card'
import { cn } from '@renderer/lib/cn'
import type { SiteTemplateId } from './site-global-presets'
import { buildSiteGlobalStylesheet, inferSiteTemplateFromGlobalCss } from './site-global-presets'
import { SITE_GLOBAL_CSS_PATH } from './design-workspace-paths'

function t(locale: AppLocale, en: string, ko: string) {
  return locale === 'ko' ? ko : en
}

const TEMPLATES: { id: SiteTemplateId; labelEn: string; labelKo: string; hintEn: string; hintKo: string }[] = [
  {
    id: 'warm',
    labelEn: 'Warm archive',
    labelKo: '웜 아카이브',
    hintEn: 'Paper tones and serif headings (default column site).',
    hintKo: '종이 톤과 세리프 헤딩(기본 컬럼 사이트).'
  },
  {
    id: 'dark',
    labelEn: 'Dark ink',
    labelKo: '다크 잉크',
    hintEn: 'Cool dark surfaces with icy accent.',
    hintKo: '차가운 다크 배경과 하이라이트 액센트.'
  },
  {
    id: 'light',
    labelEn: 'Clean light',
    labelKo: '클린 라이트',
    hintEn: 'Neutral light surfaces with blue accent.',
    hintKo: '중립적인 라이트 배경과 블루 액센트.'
  }
]

export function TemplateModePanel({ locale }: { locale: AppLocale }) {
  const [busy, setBusy] = useState(false)
  const [applyingId, setApplyingId] = useState<SiteTemplateId | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [appliedTemplate, setAppliedTemplate] = useState<SiteTemplateId>('warm')
  const [loadingApplied, setLoadingApplied] = useState(true)

  const loadAppliedTemplate = useCallback(async () => {
    const api = window.emprint?.workspaceSrc
    if (!api?.read) {
      setLoadingApplied(false)
      return
    }
    setLoadingApplied(true)
    try {
      const res = await api.read({ path: SITE_GLOBAL_CSS_PATH })
      setAppliedTemplate(inferSiteTemplateFromGlobalCss(res.content))
    } catch {
      setAppliedTemplate('warm')
    } finally {
      setLoadingApplied(false)
    }
  }, [])

  useEffect(() => {
    void loadAppliedTemplate()
  }, [loadAppliedTemplate])

  async function applyTemplate(id: SiteTemplateId) {
    if (appliedTemplate === id) return
    const api = window.emprint?.workspaceSrc
    if (!api?.save) {
      setError(t(locale, 'Workspace source API unavailable.', '워크스페이스 소스 API를 사용할 수 없습니다.'))
      return
    }
    setBusy(true)
    setApplyingId(id)
    setError(null)
    try {
      const css = buildSiteGlobalStylesheet(id)
      await api.save({ path: SITE_GLOBAL_CSS_PATH, content: css })
      setAppliedTemplate(id)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy(false)
      setApplyingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-[11px] uppercase tracking-[0.16em] text-muted">
          {t(locale, 'Template', '템플릿')}
        </div>
        <p className="mt-1 text-sm text-muted">
          {t(
            locale,
            'Applies a full site stylesheet to src/styles/global.css.',
            'src/styles/global.css 전체 스타일시트를 이 템플릿으로 바꿉니다.'
          )}
        </p>
      </div>

      {error ? (
        <div className="rounded-md border border-danger/50 bg-dangerBg px-3 py-2 text-xs text-dangerInk">{error}</div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        {TEMPLATES.map((tpl) => {
          const isApplied = appliedTemplate === tpl.id
          const isApplying = busy && applyingId === tpl.id
          return (
            <Card
              key={tpl.id}
              className={cn(
                'space-y-2 border p-4 transition',
                isApplied ? 'border-accent/50 bg-panel2/60' : 'border-border bg-panel'
              )}
            >
              <div className="text-sm font-semibold text-ink">{locale === 'ko' ? tpl.labelKo : tpl.labelEn}</div>
              <p className="text-xs leading-relaxed text-muted">{locale === 'ko' ? tpl.hintKo : tpl.hintEn}</p>
              <Button
                type="button"
                className="h-8 w-full"
                variant={isApplied ? 'outline' : 'primary'}
                disabled={loadingApplied || busy || isApplied}
                onClick={() => void applyTemplate(tpl.id)}
              >
                {isApplying
                  ? t(locale, 'Applying…', '적용 중…')
                  : isApplied
                    ? t(locale, 'Applied', '적용됨')
                    : t(locale, 'Apply', '적용하기')}
              </Button>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
