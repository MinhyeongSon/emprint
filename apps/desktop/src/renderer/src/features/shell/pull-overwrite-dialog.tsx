import { createPortal } from 'react-dom'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { pick } from '@renderer/lib/i18n'
import type { AppLocale } from '@emprint/shared'
import { Button } from '@renderer/components/ui/button'


interface PullOverwriteDialogProps {
  open: boolean
  locale: AppLocale
  behind: number
  busy: boolean
  /** When set, confirm continues into publish after the overwrite pull. */
  continueToPublish?: boolean
  onCancel(): void
  onConfirm(): void
}

export function PullOverwriteDialog({
  open,
  locale,
  behind,
  busy,
  continueToPublish = false,
  onCancel,
  onConfirm
}: PullOverwriteDialogProps) {
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
              {pick(locale, 'Replace local copy with the live site?', '로컬을 배포본으로 맞출까요?')}
            </h2>
            <p className="text-sm leading-relaxed text-muted">
              {pick(
                locale,
                `There ${behind === 1 ? 'is' : 'are'} ${behind} update${behind === 1 ? '' : 's'} on the live site that your local copy does not have yet. If you changed the same files locally, a normal merge might fail — Emprint will match your folder to the live site instead.`,
                `배포된 사이트에 로컬에 없는 변경이 ${behind}건 있습니다. 같은 파일을 로컬에서 수정했다면 일반 병합이 어려울 수 있어, 폴더를 배포본과 동일하게 맞춥니다.`
              )}
            </p>
            <p className="text-sm leading-relaxed text-[#a34e00]">
              {pick(
                locale,
                'Unpublished edits and staged changes in this anthology may be lost.',
                '아직 발행하지 않은 글의 작업 내용과 스테이징된 변경이 사라질 수 있습니다.'
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
                {pick(locale, 'Updating…', '가져오는 중…')}
              </>
            ) : continueToPublish ? (
              pick(locale, 'Update and continue', '가져온 뒤 계속')
            ) : (
              pick(locale, 'Use live site copy', '배포본으로 맞추기')
            )}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}
