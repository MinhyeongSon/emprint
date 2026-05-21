import { createPortal } from 'react-dom'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { pick } from '@renderer/lib/i18n'
import type { AppLocale } from '@emprint/shared'
import { Button } from '@renderer/components/ui/button'


interface ImprintRollbackDialogProps {
  open: boolean
  locale: AppLocale
  imprintTitle: string
  busy: boolean
  onCancel(): void
  onConfirm(): void
}

export function ImprintRollbackDialog({
  open,
  locale,
  imprintTitle,
  busy,
  onCancel,
  onConfirm
}: ImprintRollbackDialogProps) {
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
              {pick(locale, 'Restore this Imprint as your draft?', '이 발행 시점을 초안으로 되돌릴까요?')}
            </h2>
            <p className="text-sm leading-relaxed text-muted">
              {pick(
                locale,
                `Your working copy will match “${imprintTitle}”. Past Imprint entries stay on the timeline — nothing is erased from history.`,
                `작업 중인 내용이 「${imprintTitle}」 시점과 같아집니다. 발행 기록은 그대로 남고, 과거 기록이 지워지지는 않습니다.`
              )}
            </p>
            <p className="text-sm leading-relaxed text-[#a34e00]">
              {pick(
                locale,
                'Unsaved edits since that publish may be lost. Reopen posts after restoring to see the updated files.',
                '그 이후에 저장하지 않은 변경은 사라질 수 있습니다. 되돌린 뒤 글을 다시 열어 확인하세요.'
              )}
            </p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" disabled={busy} onClick={onCancel}>
            {pick(locale, 'Cancel', '취소')}
          </Button>
          <Button type="button" variant="primary" disabled={busy} onClick={onConfirm}>
            {busy ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                {pick(locale, 'Restoring…', '되돌리는 중…')}
              </>
            ) : (
              pick(locale, 'Restore draft', '초안으로 되돌리기')
            )}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}
