import { createPortal } from 'react-dom'
import { AlertTriangle, Loader2 } from 'lucide-react'
import type { AppLocale } from '@emprint/shared'
import { Button } from '@renderer/components/ui/button'

function t(locale: AppLocale, en: string, ko: string): string {
  return locale === 'ko' ? ko : en
}

interface ResetDraftDialogProps {
  open: boolean
  locale: AppLocale
  busy: boolean
  onCancel(): void
  onConfirm(): void
}

export function ResetDraftDialog({ open, locale, busy, onCancel, onConfirm }: ResetDraftDialogProps) {
  if (!open) return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="emprint-scrim titlebar-nodrag fixed inset-0 z-[75] flex items-start justify-center px-4 py-16 backdrop-blur-[2px]"
      onClick={() => {
        if (!busy) onCancel()
      }}
    >
      <div
        className="w-full max-w-md rounded-lg border border-border bg-surface p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#e85d04]" aria-hidden />
          <div className="min-w-0 space-y-2">
            <h2 className="text-sm font-semibold text-ink">
              {t(locale, 'Reset draft to last publish?', '초안을 마지막 발행 상태로 되돌릴까요?')}
            </h2>
            <p className="text-sm leading-relaxed text-muted">
              {t(
                locale,
                'Discards uncommitted changes and restores your working copy to the latest Imprint. Publish history is not changed.',
                '아직 발행하지 않은 변경을 버리고, 작업 중인 내용을 가장 최근 발행 상태로 맞춥니다. 발행 기록은 바뀌지 않습니다.'
              )}
            </p>
            <p className="text-sm leading-relaxed text-[#a34e00]">
              {t(
                locale,
                'Reopen posts after resetting to see the restored files.',
                '되돌린 뒤 글을 다시 열어 확인하세요.'
              )}
            </p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" disabled={busy} onClick={onCancel}>
            {t(locale, 'Cancel', '취소')}
          </Button>
          <Button type="button" variant="primary" disabled={busy} onClick={onConfirm}>
            {busy ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                {t(locale, 'Resetting…', '되돌리는 중…')}
              </>
            ) : (
              t(locale, 'Reset draft', '초안 되돌리기')
            )}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}
