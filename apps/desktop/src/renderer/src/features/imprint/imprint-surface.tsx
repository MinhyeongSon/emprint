import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, History, Loader2, RefreshCw } from 'lucide-react'
import type { AppLocale, GitCommitNode } from '@emprint/shared'
import { Button } from '@renderer/components/ui/button'
import { cn } from '@renderer/lib/cn'
import { ImprintRollbackDialog } from './imprint-rollback-dialog'

function t(locale: AppLocale, en: string, ko: string): string {
  return locale === 'ko' ? ko : en
}

interface ImprintSurfaceProps {
  locale: AppLocale
  /** Bumped by app-shell after each publish so we refetch. */
  refreshToken?: number
  onSyncChange?(): void
  /** Called after rollback so open editors reload from disk. */
  onWorkingStateRestored?(): void
}

const DEFAULT_LIMIT = 200

/**
 * A non-technical, time-ordered view of every publish. We deliberately avoid
 * showing commit SHAs, parent commits, branch refs, or any merge structure —
 * users think of these as "marks I left along the way", not as a DAG. The
 * graph is a single vertical lane with a dot per publish and a connecting
 * line, giving it the feel of a journal timeline.
 */
export function ImprintSurface({ locale, refreshToken, onSyncChange, onWorkingStateRestored }: ImprintSurfaceProps) {
  const [commits, setCommits] = useState<GitCommitNode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadTick, setReloadTick] = useState(0)
  const [selectedSha, setSelectedSha] = useState<string | null>(null)
  const [rollbackOpen, setRollbackOpen] = useState(false)
  const [rollbackBusy, setRollbackBusy] = useState(false)
  const [rollbackError, setRollbackError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    void (async () => {
      try {
        // Keep this to the active branch — we don't want merge complexity to
        // leak into the user-facing timeline.
        const log = await window.emprint.git.log({ limit: DEFAULT_LIMIT, allBranches: false })
        if (cancelled) return
        setCommits(log)
      } catch (caught) {
        if (cancelled) return
        const m = caught instanceof Error ? caught.message : String(caught)
        setError(m)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [refreshToken, reloadTick])

  const selectedCommit = useMemo(
    () => (selectedSha ? commits.find((c) => c.sha === selectedSha) ?? null : null),
    [commits, selectedSha]
  )
  const focused = selectedCommit ?? commits[0] ?? null

  const handleRollbackConfirm = async () => {
    if (!focused || rollbackBusy) return
    setRollbackBusy(true)
    setRollbackError(null)
    try {
      await window.emprint.git.rollback({ sha: focused.sha })
      setRollbackOpen(false)
      onSyncChange?.()
      onWorkingStateRestored?.()
    } catch (caught) {
      const m = caught instanceof Error ? caught.message : String(caught)
      setRollbackError(m)
    } finally {
      setRollbackBusy(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 py-8 lg:px-10">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-[0.16em] text-muted">Imprint</div>
          <div className="mt-2 text-[22px] font-semibold tracking-[-0.03em] text-ink">
            {t(locale, 'Publish history', '발행 기록')}
          </div>
          <div className="mt-1 text-xs text-muted">
            {t(
              locale,
              'Every publish leaves a mark here, newest at the top.',
              '발행할 때마다 흔적이 쌓입니다. 최신 발행이 가장 위에 보여요.'
            )}
          </div>
        </div>
        <Button
          variant="outline"
          type="button"
          className="h-8 w-8 shrink-0 p-0"
          aria-label={t(locale, 'Refresh', '새로고침')}
          title={t(locale, 'Refresh', '새로고침')}
          disabled={loading}
          onClick={() => setReloadTick((n) => n + 1)}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} aria-hidden />
          ) : (
            <RefreshCw className="h-4 w-4" strokeWidth={2} aria-hidden />
          )}
        </Button>
      </div>

      {error ? (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2 rounded-md border border-danger/40 bg-dangerBg px-3 py-2 text-[12px] text-dangerInk"
        >
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
          <div className="min-w-0">
            <div className="font-medium">
              {t(locale, 'Could not load history', '발행 기록을 불러오지 못했습니다')}
            </div>
            <div className="mt-0.5 break-words text-[11px] leading-5">{error}</div>
          </div>
        </div>
      ) : null}

      {loading && commits.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface px-4 py-6 text-sm text-muted">
          {t(locale, 'Loading…', '불러오는 중…')}
        </div>
      ) : commits.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface px-4 py-10 text-center text-sm text-muted">
          {t(
            locale,
            'No publishes yet. Use the Publish button to leave your first mark.',
            '아직 발행 기록이 없어요. 사이드바의 발행 버튼으로 첫 흔적을 남겨보세요.'
          )}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <ol role="list" className="overflow-hidden rounded-lg border border-border bg-surface">
            {commits.map((commit, idx) => (
              <Entry
                key={commit.sha}
                commit={commit}
                locale={locale}
                isLast={idx === commits.length - 1}
                isFirst={idx === 0}
                selected={commit.sha === (selectedCommit?.sha ?? commits[0]?.sha)}
                onSelect={() => setSelectedSha(commit.sha)}
              />
            ))}
          </ol>

          <aside className="rounded-lg border border-border bg-surface p-4">
            <Detail
              locale={locale}
              commit={focused}
              onRestore={() => {
                setRollbackError(null)
                setRollbackOpen(true)
              }}
            />
            {rollbackError ? (
              <p className="mt-3 text-[11px] leading-relaxed text-dangerInk" role="alert">
                {rollbackError}
              </p>
            ) : null}
          </aside>
        </div>
      )}

      {focused ? (
        <ImprintRollbackDialog
          open={rollbackOpen}
          locale={locale}
          imprintTitle={focused.summary || t(locale, 'this publish', '이 발행')}
          busy={rollbackBusy}
          onCancel={() => {
            if (!rollbackBusy) setRollbackOpen(false)
          }}
          onConfirm={() => void handleRollbackConfirm()}
        />
      ) : null}
    </div>
  )
}

function Entry({
  commit,
  locale,
  isFirst,
  isLast,
  selected,
  onSelect
}: {
  commit: GitCommitNode
  locale: AppLocale
  isFirst: boolean
  isLast: boolean
  selected: boolean
  onSelect(): void
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          'flex w-full items-start gap-4 border-b border-border/60 px-5 py-4 text-left transition last:border-b-0',
          selected ? 'bg-panel2/60' : 'hover:bg-panel2/40'
        )}
      >
        <div className="relative flex w-3 shrink-0 justify-center self-stretch" aria-hidden>
          {/* The vertical line spans the full row; the dot is layered on top
              of it so we don't have to compute the line's start/end pixel
              precisely. Top/bottom segments are hidden on the first/last
              entry so the timeline reads cleanly at both ends. */}
          <span
            className={cn(
              'absolute left-1/2 w-px -translate-x-1/2 bg-border',
              isFirst ? 'top-[14px]' : 'top-0',
              isLast ? 'h-[14px]' : 'bottom-0'
            )}
          />
          <span
            className={cn(
              'relative z-10 mt-[10px] inline-block h-2.5 w-2.5 shrink-0 rounded-full ring-[3px]',
              selected
                ? 'bg-accent ring-accent/25'
                : 'bg-accent/70 ring-transparent'
            )}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-ink">{commit.summary || '(no message)'}</div>
          <div className="mt-1 text-xs text-muted">
            <span>{formatRelative(locale, commit.authoredAt)}</span>
            {commit.authorName ? (
              <>
                <span aria-hidden> · </span>
                <span>{commit.authorName}</span>
              </>
            ) : null}
          </div>
        </div>
      </button>
    </li>
  )
}

function Detail({
  locale,
  commit,
  onRestore
}: {
  locale: AppLocale
  commit: GitCommitNode | null
  onRestore(): void
}) {
  if (!commit) {
    return (
      <div className="text-sm text-muted">
        {t(locale, 'Select an entry to read the full note.', '항목을 선택하면 메모를 읽을 수 있어요.')}
      </div>
    )
  }
  // Split the headline (first line) from the rest so the layout reads like a
  // short journal entry rather than a commit dump.
  const lines = commit.message ? commit.message.split(/\r?\n/) : [commit.summary]
  const headline = lines[0] ?? commit.summary
  const body = lines.slice(1).join('\n').trim()

  return (
    <div className="space-y-3">
      <div>
        <div className="text-[11px] uppercase tracking-[0.16em] text-muted">
          {t(locale, 'Note', '메모')}
        </div>
        <div className="mt-1 text-sm font-medium leading-6 text-ink">{headline}</div>
        {body ? (
          <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted">{body}</div>
        ) : null}
      </div>

      <div className="grid gap-1 border-t border-border pt-3 text-[12px] text-muted">
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-[0.16em]">{t(locale, 'Published', '발행 시각')}</span>
          <span className="text-ink">{formatAbsolute(locale, commit.authoredAt)}</span>
        </div>
        {commit.authorName ? (
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-[0.16em]">{t(locale, 'By', '작성자')}</span>
            <span className="truncate text-ink">{commit.authorName}</span>
          </div>
        ) : null}
      </div>

      <Button type="button" variant="outline" className="mt-4 h-9 w-full gap-1.5 text-[12px]" onClick={onRestore}>
        <History className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
        {t(locale, 'Restore as draft', '초안으로 되돌리기')}
      </Button>
    </div>
  )
}

function formatRelative(locale: AppLocale, isoDate: string): string {
  const d = new Date(isoDate)
  if (Number.isNaN(d.getTime())) return ''
  const now = Date.now()
  const diff = now - d.getTime()
  const sec = Math.round(diff / 1000)
  if (sec < 60) return t(locale, 'just now', '방금 전')
  const min = Math.round(sec / 60)
  if (min < 60) return locale === 'ko' ? `${min}분 전` : `${min} min ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return locale === 'ko' ? `${hr}시간 전` : `${hr} hr ago`
  const day = Math.round(hr / 24)
  if (day < 30) return locale === 'ko' ? `${day}일 전` : `${day} day${day === 1 ? '' : 's'} ago`
  return formatAbsolute(locale, isoDate)
}

function formatAbsolute(locale: AppLocale, isoDate: string): string {
  const d = new Date(isoDate)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
