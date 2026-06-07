import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, Loader2, Trash2, X } from 'lucide-react'
import { pick } from '@renderer/lib/i18n'
import type { AppLocale } from '@emprint/shared'
import { Button } from '@renderer/components/ui/button'
import { cn } from '@renderer/lib/cn'


interface PostDeleteDialogProps {
  open: boolean
  locale: AppLocale
  /** Section the post lives in. Used to tailor the warning copy. */
  section: 'posts' | 'drafts' | 'knowledge'
  /** Human-friendly title surfaced in the body. Falls back to the path. */
  title: string
  /** Workspace-relative path of the post being deleted (e.g. `posts/2024-01-01-hello.md`). */
  path: string
  /** When set, shows bulk-delete copy and hides single-item path emphasis. */
  bulkCount?: number
  deleting: boolean
  onCancel(): void
  onConfirm(): void
}

/**
 * Confirmation modal for deleting a post or draft. Mirrors the asset delete
 * dialog's UX so destructive actions across Emprint look the same:
 *  - Cancel gets initial focus.
 *  - Deleting from `posts/` shows stronger language because the next publish
 *    will remove the entry from the live site.
 *  - Drafts are local-only, so the wording is gentler.
 *  - Esc / scrim click cancels unless a deletion is already in flight.
 */
export function PostDeleteDialog({
  open,
  locale,
  section,
  title,
  path,
  bulkCount,
  deleting,
  onCancel,
  onConfirm
}: PostDeleteDialogProps) {
  const cancelRef = useRef<HTMLButtonElement | null>(null)
  const isPublished = section === 'posts'
  const isBulk = (bulkCount ?? 0) > 1

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
      aria-labelledby="post-delete-title"
      className="emprint-scrim titlebar-nodrag fixed inset-0 z-[70] flex items-start justify-center px-4 py-16 backdrop-blur-[2px]"
      onClick={() => {
        if (!deleting) onCancel()
      }}
    >
      <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="space-y-4 rounded-lg border border-border bg-surface p-4 shadow-panel">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-2">
              <div
                className={cn(
                  'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                  isPublished ? 'bg-dangerBg text-dangerInk' : 'bg-panel2 text-muted'
                )}
              >
                <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
              </div>
              <div className="min-w-0">
                <div id="post-delete-title" className="text-sm font-semibold tracking-[-0.01em] text-ink">
                  {isBulk
                    ? isPublished
                      ? pick(
                          locale,
                          `Delete ${bulkCount} published posts?`,
                          `발행한 글 ${bulkCount}개를 삭제할까요?`
                        )
                      : pick(locale, `Delete ${bulkCount} drafts?`, `드래프트 ${bulkCount}개를 삭제할까요?`)
                    : isPublished
                      ? pick(locale, 'Delete this published post?', '발행한 글을 삭제할까요?')
                      : pick(locale, 'Delete this draft?', '드래프트를 삭제할까요?')}
                </div>
                {isBulk ? (
                  <div className="mt-1 text-[12px] text-muted">
                    {pick(
                      locale,
                      'Selected files will be removed from this anthology.',
                      '선택한 파일이 이 앤솔로지에서 삭제됩니다.'
                    )}
                  </div>
                ) : (
                  <>
                    <div className="mt-1 break-words text-[12px] text-ink/85">{title || path}</div>
                    <div className="mt-0.5 break-all font-mono text-[10.5px] text-muted">{path}</div>
                  </>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onCancel}
              disabled={deleting}
              aria-label={pick(locale, 'Close', '닫기')}
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border border-transparent text-muted transition hover:border-border hover:text-ink disabled:opacity-50"
            >
              <X className="h-4 w-4" strokeWidth={2} aria-hidden />
            </button>
          </div>

          {isPublished ? (
            <div className="rounded-md border border-danger/40 bg-dangerBg/70 px-3 py-2.5 text-[12px] leading-relaxed text-dangerInk">
              {pick(
                locale,
                'The next time you publish, this post will be removed from your live site as well. This action cannot be undone from inside Emprint.',
                '다음 발행 시 라이브 사이트에서도 함께 사라집니다. Emprint 안에서는 되돌릴 수 없습니다.'
              )}
            </div>
          ) : (
            <div className="rounded-md border border-border bg-panel px-3 py-2.5 text-[12px] leading-relaxed text-muted">
              {pick(
                locale,
                'This draft is only on your computer, so nothing about your live site changes. The file will be removed from drafts/ and cannot be undone from inside Emprint.',
                '이 드래프트는 이 컴퓨터에만 있으므로 라이브 사이트에는 영향이 없습니다. drafts/ 폴더에서 파일이 삭제되며 Emprint 안에서는 되돌릴 수 없습니다.'
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
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
              variant={isPublished ? 'outline' : 'primary'}
              className={cn(
                'h-8 gap-1.5 px-3 text-xs',
                isPublished &&
                  'border-danger/60 bg-dangerBg/80 text-dangerInk hover:border-danger hover:bg-dangerBg'
              )}
              onClick={onConfirm}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} aria-hidden />
              ) : (
                <Trash2 className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              )}
              <span>{pick(locale, 'Delete', '삭제')}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
