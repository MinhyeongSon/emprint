import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, ArrowUpFromLine, CheckCircle2, Loader2, X } from 'lucide-react'
import { pick } from '@renderer/lib/i18n'
import type { AppLocale, GitPublishResult, GitWorkingTreeSummary } from '@emprint/shared'
import { Button } from '@renderer/components/ui/button'
import { DeployStatusPanel } from './deploy-status-panel'


interface PublishDialogProps {
  open: boolean
  locale: AppLocale
  /** Bump after post/asset edits so the pending list stays accurate while open. */
  refreshToken?: number
  onClose(): void
  onPublished?(result: GitPublishResult): void
}

type Phase = 'idle' | 'loading' | 'submitting' | 'done' | 'error'

export function PublishDialog({ open, locale, refreshToken, onClose, onPublished }: PublishDialogProps) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [summary, setSummary] = useState<GitWorkingTreeSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<GitPublishResult | null>(null)
  const [message, setMessage] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  // Re-fetch the working-tree snapshot every time the dialog opens so the
  // user isn't publishing against a stale view.
  useEffect(() => {
    if (!open) return
    let cancelled = false
    setPhase('loading')
    setError(null)
    setResult(null)
    setMessage('')
    // Drop the previous dialog snapshot immediately. Otherwise `phase` is
    // `loading` while `summary` still holds stale paths — `canPublish` stays
    // false (loading) but the Changes panel still renders old rows, which
    // feels like "I see changes but I can't type a note or publish".
    setSummary(null)
    void (async () => {
      try {
        const snap = await window.emprint.git.workingTree()
        if (cancelled) return
        setSummary(snap)
        setPhase('idle')
      } catch (caught) {
        if (cancelled) return
        const m = caught instanceof Error ? caught.message : String(caught)
        setSummary(null)
        setError(m)
        setPhase('error')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, refreshToken])

  useEffect(() => {
    if (!open) return
    const id = window.setTimeout(() => textareaRef.current?.focus(), 30)
    return () => window.clearTimeout(id)
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && phase !== 'submitting') {
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, phase, onClose])

  const pendingCount = summary?.pendingFiles.length ?? 0
  const hasUnpushedLocal = (summary?.ahead ?? 0) > 0
  const canPublish = useMemo(() => {
    if (phase === 'submitting' || phase === 'loading') return false
    if (!summary) return false
    if (message.trim().length === 0) return false
    return pendingCount > 0 || hasUnpushedLocal
  }, [phase, summary, message, pendingCount, hasUnpushedLocal])

  const handleSubmit = async () => {
    if (!canPublish) return
    setPhase('submitting')
    setError(null)
    try {
      // We always attempt to push; the main process gracefully degrades to a
      // local-only commit when there's no remote / no auth, and we tell the
      // user about that in plain language afterward.
      const res = await window.emprint.git.publish({
        message: message.trim(),
        push: true
      })
      setResult(res)
      setPhase('done')
      onPublished?.(res)
    } catch (caught) {
      const m = caught instanceof Error ? caught.message : String(caught)
      setError(m)
      setPhase('error')
    }
  }

  if (!open) return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="publish-dialog-title"
      className="emprint-scrim titlebar-nodrag fixed inset-0 z-[70] flex items-start justify-center px-4 py-16 backdrop-blur-[2px]"
      onClick={() => {
        if (phase !== 'submitting') onClose()
      }}
    >
      <div className="w-full max-w-xl" onClick={(e) => e.stopPropagation()}>
        <div className="space-y-4 rounded-lg border border-border bg-surface p-4 shadow-panel">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div
                id="publish-dialog-title"
                className="text-sm font-semibold tracking-[-0.01em] text-ink"
              >
                {pick(locale, 'Publish your changes', '변경사항 발행')}
              </div>
              <div className="mt-1 text-xs text-muted">
                {pick(
                  locale,
                  'Leave a short note about what you changed. It will be saved with the publish.',
                  '이번에 무엇을 바꿨는지 짧게 적어주세요. 발행 기록에 함께 저장됩니다.'
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={phase === 'submitting'}
              aria-label={pick(locale, 'Close', '닫기')}
              className="inline-flex h-7 w-7 items-center justify-center rounded-sm border border-transparent text-muted transition hover:border-border hover:text-ink disabled:opacity-50"
            >
              <X className="h-4 w-4" strokeWidth={2} aria-hidden />
            </button>
          </div>

          {phase === 'loading' ? (
            <div className="flex items-center gap-2 rounded-md border border-border bg-panel px-3 py-2 text-[12px] text-muted">
              <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} aria-hidden />
              <span>{pick(locale, 'Reading changes…', '변경사항을 확인하는 중…')}</span>
            </div>
          ) : null}

          {summary && phase !== 'done' ? (
            <ChangesPanel locale={locale} summary={summary} />
          ) : null}

          {phase === 'done' && result ? (
            <>
              <DoneBanner locale={locale} result={result} />
              <DeployStatusPanel locale={locale} active={Boolean(result.pushed)} />
            </>
          ) : null}

          {phase !== 'done' ? (
            <div className="space-y-2">
              <label
                className="block text-[11px] uppercase tracking-[0.16em] text-muted"
                htmlFor="publish-commit-message"
              >
                {pick(locale, 'Note', '메모')}
              </label>
              <textarea
                ref={textareaRef}
                id="publish-commit-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={phase === 'submitting'}
                placeholder={pick(
                  locale,
                  'What did you change? (the first line becomes the headline)',
                  '무엇을 바꿨나요? (첫 줄이 헤드라인으로 사용됩니다)'
                )}
                rows={4}
                className="block w-full resize-y rounded-md border border-border bg-panel px-3 py-2 text-sm leading-6 text-ink outline-none transition placeholder:text-muted/70 focus:border-accent/60 focus:ring-1 focus:ring-accent/40 disabled:opacity-60"
                onKeyDown={(event) => {
                  if (
                    (event.metaKey || event.ctrlKey) &&
                    event.key === 'Enter' &&
                    canPublish
                  ) {
                    event.preventDefault()
                    void handleSubmit()
                  }
                }}
              />
            </div>
          ) : null}

          {error ? (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-danger/40 bg-dangerBg px-3 py-2 text-[12px] text-dangerInk"
            >
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
              <div className="min-w-0">
                <div className="font-medium">{pick(locale, 'Publish failed', '발행 실패')}</div>
                <div className="mt-0.5 break-words text-[11px] leading-5">{error}</div>
              </div>
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
            {phase === 'done' ? (
              <Button type="button" className="h-8 px-3 text-xs" onClick={onClose}>
                {pick(locale, 'Done', '확인')}
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  type="button"
                  className="h-8 px-3 text-xs"
                  onClick={onClose}
                  disabled={phase === 'submitting'}
                >
                  {pick(locale, 'Cancel', '취소')}
                </Button>
                <Button
                  type="button"
                  className="h-8 gap-1.5 px-3 text-xs"
                  disabled={!canPublish}
                  onClick={() => void handleSubmit()}
                >
                  {phase === 'submitting' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} aria-hidden />
                  ) : (
                    <ArrowUpFromLine className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                  )}
                  <span>{pick(locale, 'Publish', '발행')}</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

function ChangesPanel({ locale, summary }: { locale: AppLocale; summary: GitWorkingTreeSummary }) {
  const totalChanges = summary.pendingFiles.length
  const hasUnpushedLocal = summary.ahead > 0

  // Roll up everything into three plain-language buckets the user actually
  // cares about: new, edited, removed. We deliberately don't surface
  // staged-vs-unstaged or renamed-vs-copied distinctions.
  const groups = useMemo(() => groupFiles(summary.pendingFiles, locale), [summary.pendingFiles, locale])

  if (totalChanges === 0 && !hasUnpushedLocal) {
    return (
      <div className="rounded-md border border-border bg-panel px-3 py-2.5 text-[12px] text-muted">
        {pick(locale, 'Nothing new to publish yet.', '아직 발행할 변경이 없어요.')}
      </div>
    )
  }

  if (totalChanges === 0 && hasUnpushedLocal) {
    return (
      <div className="rounded-md border border-border bg-panel px-3 py-2.5 text-[12px] text-muted">
        {pick(
          locale,
          'There are previously saved changes waiting to be published.',
          '이전에 저장한 변경이 아직 발행되지 않은 상태입니다.'
        )}
      </div>
    )
  }

  return (
    <div className="space-y-2 rounded-md border border-border bg-panel p-3">
      <div className="text-[11px] uppercase tracking-[0.16em] text-muted">
        {pick(locale, 'Changes', '변경 내역')}{' '}
        <span className="ml-1 text-muted/70">({totalChanges})</span>
      </div>
      <div className="max-h-44 space-y-2.5 overflow-y-auto pr-1">
        {groups.map((group) => (
          <div key={group.kind}>
            <div className="text-[10px] uppercase tracking-[0.16em] text-muted">
              {group.label} <span className="ml-1 text-muted/70">{group.files.length}</span>
            </div>
            <ul className="mt-1 space-y-0.5">
              {group.files.map((file) => (
                <li
                  key={file.path}
                  className="truncate text-[12px] leading-5 text-ink/90"
                  title={file.path}
                >
                  {formatPathForUser(file.path, locale)}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}

function DoneBanner({ locale, result }: { locale: AppLocale; result: GitPublishResult }) {
  const reason = result.pushSkippedReason
  const headline = result.pushed
    ? pick(locale, 'Published.', '발행되었습니다.')
    : result.committed
      ? pick(locale, 'Saved locally.', '로컬에 저장되었습니다.')
      : pick(locale, 'Nothing to publish.', '발행할 변경이 없었습니다.')

  // Translate the technical reason into something a non-developer would
  // actually read and act on.
  let note: string | null = null
  if (reason === 'no-remote') {
    note = pick(
      locale,
      "It's only saved on this computer for now — connect a remote to share it.",
      '아직 이 기기에만 저장되었어요. 원격 저장소를 연결하면 함께 보낼 수 있어요.'
    )
  } else if (reason === 'no-session') {
    note = pick(
      locale,
      "It's only saved on this computer for now — sign in to publish to the web.",
      '아직 이 기기에만 저장되었어요. 로그인하면 웹으로 발행할 수 있어요.'
    )
  } else if (reason === 'nothing-to-push') {
    note = pick(locale, 'Everything was already up to date.', '이미 발행되어 있었어요.')
  }

  return (
    <div className="space-y-1 rounded-md border border-accent/30 bg-panel2/60 p-3">
      <div className="flex items-center gap-2 text-sm text-ink">
        <CheckCircle2 className="h-4 w-4 text-accent" strokeWidth={2} aria-hidden />
        <span>{headline}</span>
      </div>
      {note ? <div className="text-[11px] text-muted">{note}</div> : null}
    </div>
  )
}

/**
 * Bucket changes into three categories the user understands:
 *  - new / added  → things that didn't exist before
 *  - edited      → existing things that changed
 *  - removed     → things that were deleted
 * Renames are surfaced as "edited" since the file content effectively moved.
 * Conflicts surface separately because they need attention.
 */
function groupFiles(files: GitWorkingTreeSummary['pendingFiles'], locale: AppLocale) {
  type Group = { kind: string; label: string; files: typeof files }
  const added: Group = { kind: 'added', label: pick(locale, 'New', '새로 생김'), files: [] }
  const edited: Group = { kind: 'edited', label: pick(locale, 'Edited', '수정됨'), files: [] }
  const removed: Group = { kind: 'removed', label: pick(locale, 'Removed', '삭제됨'), files: [] }
  const needsAttention: Group = {
    kind: 'attention',
    label: pick(locale, 'Needs attention', '확인 필요'),
    files: []
  }

  for (const f of files) {
    if (f.status === 'A' || f.status === '?') added.files.push(f)
    else if (f.status === 'M' || f.status === 'R' || f.status === 'C') edited.files.push(f)
    else if (f.status === 'D') removed.files.push(f)
    else if (f.status === 'U') needsAttention.files.push(f)
  }
  return [added, edited, removed, needsAttention].filter((g) => g.files.length > 0)
}

/**
 * Render a working-tree path in a friendlier form: surface the top-level
 * area (posts / drafts / assets / src) as a category label and keep just the
 * file name visible. Keeps the full path in the title attribute for users
 * who need precision.
 */
function formatPathForUser(filePath: string, locale: AppLocale): string {
  const segments = filePath.split('/')
  const top = segments[0] ?? ''
  const tail = segments.slice(1).join('/')
  const friendly: Record<string, [string, string]> = {
    posts: ['Posts', '포스트'],
    drafts: ['Drafts', '드래프트'],
    assets: ['Assets', '에셋'],
    src: ['Site', '사이트'],
    public: ['Public', '공개']
  }
  const labels = friendly[top]
  if (!labels) return filePath
  const localized = locale === 'ko' ? labels[1] : labels[0]
  return tail ? `${localized} · ${tail}` : localized
}
