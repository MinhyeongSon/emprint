import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, Loader2, Trash2, X } from 'lucide-react'
import { pick } from '@renderer/lib/i18n'
import type { AppLocale } from '@emprint/shared'
import { Button } from '@renderer/components/ui/button'


interface SectionDeleteDialogProps {
  open: boolean
  locale: AppLocale
  title: string
  path: string
  deleting: boolean
  onCancel(): void
  onConfirm(): void
}

export function SectionDeleteDialog({
  open,
  locale,
  title,
  path,
  deleting,
  onCancel,
  onConfirm
}: SectionDeleteDialogProps) {
  const cancelRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!open) return
    const id = window.setTimeout(() => cancelRef.current?.focus(), 30)
    return () => window.clearTimeout(id)
  }, [open, path])

  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && !deleting) onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, deleting, onCancel])

  if (!open) return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="section-delete-title"
      className="emprint-scrim titlebar-nodrag fixed inset-0 z-[70] flex items-start justify-center px-4 py-16 backdrop-blur-[2px]"
      onClick={() => {
        if (!deleting) onCancel()
      }}
    >
      <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="space-y-4 rounded-lg border border-border bg-surface p-4 shadow-panel">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-2">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-dangerBg text-dangerInk">
                <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
              </div>
              <div className="min-w-0">
                <div id="section-delete-title" className="text-sm font-semibold text-ink">
                  {pick(locale, 'Delete this section?', '이 섹션을 삭제할까요?')}
                </div>
                <div className="mt-1 break-words text-[12px] text-ink/85">{title || path}</div>
                <div className="mt-0.5 break-all font-mono text-[10.5px] text-muted">{path}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={onCancel}
              disabled={deleting}
              aria-label={pick(locale, 'Close', '닫기')}
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-sm text-muted hover:text-ink disabled:opacity-50"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <div className="rounded-md border border-border bg-panel px-3 py-2.5 text-[12px] leading-relaxed text-muted">
            {pick(
              locale,
              'The section file is removed. Container parents drop this id from their children list. Publish to update the live site.',
              '섹션 파일이 삭제됩니다. 컨테이너 부모는 children 목록에서 이 ID를 제거합니다. 라이브 사이트 반영은 발행 후입니다.'
            )}
          </div>
          <div className="flex justify-end gap-2 border-t border-border pt-3">
            <Button
              ref={cancelRef}
              variant="outline"
              type="button"
              className="h-8 px-3 text-xs"
              onClick={onCancel}
              disabled={deleting}
            >
              {pick(locale, 'Cancel', '취소')}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-8 gap-1.5 border-danger/60 bg-dangerBg/80 px-3 text-xs text-dangerInk hover:border-danger hover:bg-dangerBg"
              onClick={onConfirm}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              )}
              {pick(locale, 'Delete', '삭제')}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
