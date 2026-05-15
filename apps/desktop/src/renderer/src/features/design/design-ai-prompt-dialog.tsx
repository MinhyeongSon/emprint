import { useCallback, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ClipboardCopy, Loader2, Sparkles, X } from 'lucide-react'
import type { AppLocale, WorkspaceConfig } from '@emprint/shared'
import { Button } from '@renderer/components/ui/button'
import { Card } from '@renderer/components/ui/card'
import { Textarea } from '@renderer/components/ui/textarea'
import { buildDesignAiPrompt } from './design-ai-prompt'

function t(locale: AppLocale, en: string, ko: string) {
  return locale === 'ko' ? ko : en
}

export function DesignAiPromptDialog({
  locale,
  workspaceConfig,
  onClose
}: {
  locale: AppLocale
  workspaceConfig?: WorkspaceConfig | undefined
  onClose: () => void
}) {
  const [moodAndTheme, setMoodAndTheme] = useState('')
  const [requirements, setRequirements] = useState('')
  const [generated, setGenerated] = useState<string | null>(null)
  const [copyState, setCopyState] = useState<'idle' | 'copying' | 'done' | 'error'>('idle')

  const previewLength = generated?.length ?? 0

  const handleGenerate = useCallback(() => {
    const prompt = buildDesignAiPrompt({
      locale,
      workspaceConfig,
      moodAndTheme,
      requirements
    })
    setGenerated(prompt)
    setCopyState('idle')
  }, [locale, moodAndTheme, requirements, workspaceConfig])

  const handleCopy = useCallback(async () => {
    const text = generated ?? buildDesignAiPrompt({ locale, workspaceConfig, moodAndTheme, requirements })
    setCopyState('copying')
    try {
      await navigator.clipboard.writeText(text)
      setGenerated(text)
      setCopyState('done')
      window.setTimeout(() => setCopyState('idle'), 2000)
    } catch {
      setCopyState('error')
    }
  }, [generated, locale, moodAndTheme, requirements, workspaceConfig])

  const hint = useMemo(
    () =>
      t(
        locale,
        'Generate a detailed prompt, copy it, then paste into your AI chat (⌘/Ctrl+V). The assistant should return file paths and full code you can apply in Design → Code.',
        '상세 프롬프트를 만든 뒤 복사해 AI 채팅에 붙여넣으세요(⌘/Ctrl+V). 어시스턴트는 디자인 → 코드에 적용할 파일 경로와 전체 코드를 돌려줘야 합니다.'
      ),
    [locale]
  )

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="emprint-scrim titlebar-nodrag fixed inset-0 z-[85] flex items-start justify-center overflow-y-auto px-4 py-12 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <Card
        className="my-auto w-full max-w-2xl space-y-4 border border-border bg-panel p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-ink">
              <Sparkles className="h-4 w-4 text-accent" strokeWidth={2} aria-hidden />
              {t(locale, 'AI customization prompt', 'AI 커스터마이징 프롬프트')}
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted">{hint}</p>
          </div>
          <Button type="button" variant="ghost" className="h-8 w-8 shrink-0 p-0" onClick={onClose} aria-label={t(locale, 'Close', '닫기')}>
            <X className="h-4 w-4" strokeWidth={2} />
          </Button>
        </div>

        <div className="space-y-3">
          <label className="block space-y-1.5">
            <span className="text-[11px] uppercase tracking-[0.16em] text-muted">
              {t(locale, 'Mood & theme', '분위기 · 테마')}
            </span>
            <Textarea
              value={moodAndTheme}
              onChange={(e) => setMoodAndTheme(e.target.value)}
              placeholder={t(
                locale,
                'e.g. minimal dark magazine, warm paper texture, large serif headlines, muted olive accent…',
                '예: 미니멀 다크 매거진, 따뜻한 종이 질감, 큰 세리프 제목, 올리브 포인트 컬러…'
              )}
              className="min-h-[88px] font-mono text-[12px]"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-[11px] uppercase tracking-[0.16em] text-muted">
              {t(locale, 'Requirements', '요구사항')}
            </span>
            <Textarea
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              placeholder={t(
                locale,
                'e.g. wider home hero, sticky header, tag chips on cards, hide dates on list, footer with social links…',
                '예: 홈 히어로 넓게, 헤더 고정, 카드에 태그 칩, 목록에서 날짜 숨김, 푸터에 SNS 링크…'
              )}
              className="min-h-[88px] font-mono text-[12px]"
            />
          </label>
        </div>

        {generated ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 text-[11px] text-muted">
              <span>{t(locale, 'Preview', '미리보기')}</span>
              <span className="font-mono">
                {previewLength.toLocaleString()} {t(locale, 'chars', '자')}
              </span>
            </div>
            <pre className="max-h-[240px] overflow-auto rounded-md border border-border bg-panel2/80 p-3 font-mono text-[10px] leading-relaxed text-muted">
              {generated.slice(0, 4000)}
              {generated.length > 4000 ? '\n…' : ''}
            </pre>
          </div>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-3">
          <Button type="button" variant="outline" className="h-8" onClick={handleGenerate}>
            {t(locale, 'Generate prompt', '프롬프트 생성')}
          </Button>
          <Button
            type="button"
            className="h-8 gap-1.5"
            disabled={copyState === 'copying'}
            onClick={() => void handleCopy()}
          >
            {copyState === 'copying' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} aria-hidden />
            ) : copyState === 'done' ? (
              <Check className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            ) : (
              <ClipboardCopy className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            )}
            {copyState === 'done'
              ? t(locale, 'Copied', '복사됨')
              : copyState === 'error'
                ? t(locale, 'Copy failed', '복사 실패')
                : t(locale, 'Copy to clipboard', '클립보드에 복사')}
          </Button>
        </div>
      </Card>
    </div>,
    document.body
  )
}
