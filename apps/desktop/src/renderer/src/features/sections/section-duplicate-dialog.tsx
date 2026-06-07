import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Copy, Loader2, X } from 'lucide-react'
import { pick } from '@renderer/lib/i18n'
import type { AppLocale } from '@emprint/shared'
import { Button } from '@renderer/components/ui/button'

export type SectionDuplicateMode = 'shallow' | 'deep'

interface SectionDuplicateDialogProps {
  open: boolean
  locale: AppLocale
  title: string
  childCount: number
  duplicating: boolean
  onCancel(): void
  onConfirm(mode: SectionDuplicateMode): void
}

export function SectionDuplicateDialog({
  open,
  locale,
  title,
  childCount,
  duplicating,
  onCancel,
  onConfirm
}: SectionDuplicateDialogProps) {
  const cancelRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!open) return
    const id = window.setTimeout(() => cancelRef.current?.focus(), 30)
    return () => window.clearTimeout(id)
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && !duplicating) onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, duplicating, onCancel])

  if (!open) return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="section-duplicate-title"
      className="emprint-scrim titlebar-nodrag fixed inset-0 z-[70] flex items-start justify-center px-4 py-16 backdrop-blur-[2px]"
      onClick={() => {
        if (!duplicating) onCancel()
      }}
    >
      <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="space-y-4 rounded-lg border border-border bg-surface p-4 shadow-panel">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-2">
              <Copy className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={2} aria-hidden />
              <div className="min-w-0">
                <h2 id="section-duplicate-title" className="text-sm font-semibold text-ink">
                  {pick(locale, 'Duplicate section', '섹션 복제')}
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  {pick(
                    locale,
                    `"${title}" has ${childCount} child section${childCount === 1 ? '' : 's'}. Choose what to copy.`,
                    `"${title}"에 하위 섹션이 ${childCount}개 있습니다. 무엇을 복제할지 선택하세요.`
                  )}
                </p>
              </div>
            </div>
            <button
              type="button"
              className="rounded-md p-1 text-muted hover:bg-panel2 hover:text-ink"
              aria-label={pick(locale, 'Close', '닫기')}
              disabled={duplicating}
              onClick={onCancel}
            >
              <X className="h-4 w-4" strokeWidth={2} aria-hidden />
            </button>
          </div>

          <div className="space-y-2">
            <Button
              type="button"
              variant="outline"
              className="h-auto w-full flex-col items-start gap-1 px-3 py-2.5 text-left"
              disabled={duplicating}
              onClick={() => onConfirm('shallow')}
            >
              <span className="text-sm font-medium text-ink">
                {pick(locale, 'Group only', '그룹만')}
              </span>
              <span className="text-xs font-normal text-muted">
                {pick(
                  locale,
                  'Copy container title and settings. Child sections stay in the original group.',
                  '컨테이너 제목·설정만 복제합니다. 하위 섹션은 원본 그룹에 남습니다.'
                )}
              </span>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-auto w-full flex-col items-start gap-1 px-3 py-2.5 text-left"
              disabled={duplicating}
              onClick={() => onConfirm('deep')}
            >
              <span className="text-sm font-medium text-ink">
                {pick(locale, 'Group and children', '그룹 + 하위 섹션')}
              </span>
              <span className="text-xs font-normal text-muted">
                {pick(
                  locale,
                  'Duplicate the container and every child with new IDs (unpublished).',
                  '컨테이너와 모든 하위 섹션을 새 ID로 복제합니다(비공개).'
                )}
              </span>
            </Button>
          </div>

          <div className="flex justify-end gap-2">
            <button
              ref={cancelRef}
              type="button"
              className="h-8 rounded-md px-3 text-xs text-muted hover:bg-panel2 hover:text-ink disabled:opacity-50"
              disabled={duplicating}
              onClick={onCancel}
            >
              {pick(locale, 'Cancel', '취소')}
            </button>
            {duplicating ? (
              <span className="inline-flex h-8 items-center gap-1.5 px-2 text-xs text-muted">
                <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} aria-hidden />
                {pick(locale, 'Duplicating…', '복제 중…')}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
