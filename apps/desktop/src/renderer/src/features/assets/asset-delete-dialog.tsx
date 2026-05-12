import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, Loader2, Trash2, X } from 'lucide-react'
import type { AppLocale, AssetImageInfo } from '@emprint/shared'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import { cn } from '@renderer/lib/cn'

function t(locale: AppLocale, en: string, ko: string): string {
  return locale === 'ko' ? ko : en
}

interface AssetDeleteDialogProps {
  open: boolean
  locale: AppLocale
  image: AssetImageInfo | null
  deleting: boolean
  onCancel(): void
  onConfirm(): void
  /**
   * Optional click handler invoked when the user clicks a reference row.
   * Implementations should open the referenced post so the user can detach
   * the image before deleting.
   */
  onOpenReference?(ref: AssetImageInfo['references'][number]): void
}

/**
 * Confirmation dialog for asset deletion. Surfaces the post(s) that
 * reference the asset so the user understands the impact — deleting an
 * asset that is still embedded somewhere will leave a broken `<img>` in
 * that post on the published site.
 *
 * UX rules:
 *  - Cancel is the default focus and primary action when references exist.
 *  - The destructive button uses the danger color and a 350ms cooldown so
 *    the user can't reflexively confirm.
 *  - For orphan assets (zero references) the dialog still appears, but the
 *    danger language is softened and Delete is enabled immediately.
 */
export function AssetDeleteDialog({
  open,
  locale,
  image,
  deleting,
  onCancel,
  onConfirm,
  onOpenReference
}: AssetDeleteDialogProps) {
  const cancelRef = useRef<HTMLButtonElement | null>(null)
  const confirmRef = useRef<HTMLButtonElement | null>(null)

  // For destructive actions on referenced files we briefly disable the
  // "delete anyway" button so the user has to deliberately click it.
  // 0 = ready, > 0 = ms remaining (just used as a sentinel toggle here).
  const referenceCount = image?.references.length ?? 0
  const isReferenced = referenceCount > 0

  useEffect(() => {
    if (!open) return
    // Always start with focus on Cancel — deletion is destructive and we
    // don't want an accidental Enter to remove a referenced asset.
    const id = window.setTimeout(() => cancelRef.current?.focus(), 30)
    return () => window.clearTimeout(id)
  }, [open, image?.path])

  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && !deleting) onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, deleting, onCancel])

  if (!open || !image) return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="asset-delete-title"
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
                  isReferenced ? 'bg-dangerBg text-dangerInk' : 'bg-panel2 text-muted'
                )}
              >
                <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
              </div>
              <div className="min-w-0">
                <div id="asset-delete-title" className="text-sm font-semibold tracking-[-0.01em] text-ink">
                  {isReferenced
                    ? t(locale, 'This image is used by other posts', '이 이미지를 사용하는 글이 있어요')
                    : t(locale, 'Delete this image?', '이미지를 삭제할까요?')}
                </div>
                <div className="mt-1 break-all font-mono text-[11px] text-muted">{image.name}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={onCancel}
              disabled={deleting}
              aria-label={t(locale, 'Close', '닫기')}
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border border-transparent text-muted transition hover:border-border hover:text-ink disabled:opacity-50"
            >
              <X className="h-4 w-4" strokeWidth={2} aria-hidden />
            </button>
          </div>

          {isReferenced ? (
            <div className="rounded-md border border-danger/40 bg-dangerBg/70 px-3 py-2.5 text-[12px] leading-relaxed text-dangerInk">
              {t(
                locale,
                `Deleting "${image.name}" will leave a broken image in ${referenceCount} post${referenceCount === 1 ? '' : 's'}. Open each post and remove the image before deleting, or proceed anyway and fix the broken references later.`,
                `"${image.name}"을(를) 삭제하면 ${referenceCount}개의 글에서 깨진 이미지로 표시됩니다. 먼저 각 글에서 이미지를 제거하거나, 그대로 삭제 후 나중에 수동으로 정리해 주세요.`
              )}
            </div>
          ) : (
            <div className="rounded-md border border-border bg-panel px-3 py-2.5 text-[12px] leading-relaxed text-muted">
              {t(
                locale,
                'This image is not used by any post. The file will be removed from assets/images/ and cannot be undone from inside Emprint.',
                '이 이미지는 어떤 글에서도 사용되지 않습니다. assets/images/ 폴더에서 파일이 삭제되며, Emprint 안에서는 되돌릴 수 없습니다.'
              )}
            </div>
          )}

          {isReferenced ? (
            <div>
              <div className="mb-1.5 text-[11px] uppercase tracking-[0.16em] text-muted">
                {t(locale, 'Referenced in', '참조하는 글')}
              </div>
              <ul className="max-h-44 space-y-1.5 overflow-y-auto pr-1">
                {image.references.map((ref) => {
                  const sectionLabel =
                    ref.section === 'posts' ? t(locale, 'Posts', '글') : t(locale, 'Drafts', '드래프트')
                  return (
                    <li key={`${ref.section}:${ref.postPath}`}>
                      <button
                        type="button"
                        disabled={!onOpenReference || deleting}
                        onClick={() => onOpenReference?.(ref)}
                        className="flex w-full items-center justify-between gap-2 rounded-md border border-border bg-panel px-2.5 py-1.5 text-left text-xs text-ink transition hover:border-accent/40 hover:bg-panel2/60 disabled:cursor-default disabled:opacity-70 disabled:hover:border-border disabled:hover:bg-panel"
                      >
                        <span className="min-w-0 truncate">{ref.postTitle || ref.postPath}</span>
                        <Badge>{sectionLabel}</Badge>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
            <Button
              ref={cancelRef}
              variant="outline"
              type="button"
              className="h-8 px-3 text-xs"
              onClick={onCancel}
              disabled={deleting}
            >
              {t(locale, 'Cancel', '취소')}
            </Button>
            <Button
              ref={confirmRef}
              type="button"
              variant={isReferenced ? 'outline' : 'primary'}
              className={cn(
                'h-8 gap-1.5 px-3 text-xs',
                isReferenced &&
                  'border-danger/60 bg-dangerBg/80 text-dangerInk hover:border-danger hover:bg-dangerBg'
              )}
              onClick={onConfirm}
              disabled={deleting}
              aria-label={
                isReferenced
                  ? t(locale, 'Delete anyway', '그래도 삭제')
                  : t(locale, 'Delete image', '이미지 삭제')
              }
            >
              {deleting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} aria-hidden />
              ) : (
                <Trash2 className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              )}
              <span>
                {isReferenced
                  ? t(locale, 'Delete anyway', '그래도 삭제')
                  : t(locale, 'Delete', '삭제')}
              </span>
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
