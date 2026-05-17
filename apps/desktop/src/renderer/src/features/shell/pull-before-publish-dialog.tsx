import { createPortal } from 'react-dom'
import { AlertTriangle, Loader2 } from 'lucide-react'
import type { AppLocale } from '@emprint/shared'
import { Button } from '@renderer/components/ui/button'

function t(locale: AppLocale, en: string, ko: string): string {
  return locale === 'ko' ? ko : en
}

interface PullBeforePublishDialogProps {
  open: boolean
  locale: AppLocale
  behind: number
  busy: boolean
  onCancel(): void
  onConfirm(): void
}

export function PullBeforePublishDialog({
  open,
  locale,
  behind,
  busy,
  onCancel,
  onConfirm
}: PullBeforePublishDialogProps) {
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
              {t(locale, 'Updates available on the remote', '원격에 업데이트가 있습니다')}
            </h2>
            <p className="text-sm leading-relaxed text-muted">
              {t(
                locale,
                `There ${behind === 1 ? 'is' : 'are'} ${behind} update${behind === 1 ? '' : 's'} on the live site that are not in your local copy yet. Pull them first, then publish.`,
                `배포된 사이트에 로컬에 아직 없는 변경이 ${behind}건 있습니다. 먼저 가져온 뒤 발행하는 것이 안전합니다.`
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
                {t(locale, 'Updating…', '가져오는 중…')}
              </>
            ) : (
              t(locale, 'Update first', '먼저 가져오기')
            )}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}
