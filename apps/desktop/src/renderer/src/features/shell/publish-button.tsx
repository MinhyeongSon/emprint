import { useEffect, useState } from 'react'
import { ArrowUpFromLine, Loader2 } from 'lucide-react'
import type { AppLocale, GitWorkingTreeSummary } from '@emprint/shared'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'

function t(locale: AppLocale, en: string, ko: string): string {
  return locale === 'ko' ? ko : en
}

interface PublishButtonProps {
  locale: AppLocale
  onClick(): void
  /**
   * Bumped by the parent whenever it knows the working tree may have changed
   * (e.g. after the publish dialog closes). Triggers a refetch.
   */
  refreshToken?: number
  /**
   * When true, the currently open document has unsaved changes. The button
   * stays visible (so the user can still see what's pending) but becomes
   * non-interactive — we don't want to publish a snapshot that excludes the
   * in-flight edit, and we don't want to race a save against `git add`.
   */
  blocked?: boolean
}

/**
 * Polling cadence is intentionally low because the user's own writes
 * (`refreshToken` bumps) drive most updates; the timer just catches state
 * drift from external tools (git CLI, file watchers, etc.).
 */
const POLL_INTERVAL_MS = 60_000

/**
 * Sidebar-footer entry point for the publish flow. Shows a tiny "any unpublished
 * changes?" indicator so the user has a clear nudge when there's work to ship,
 * and opens the publish dialog on click. No git terminology surfaces here.
 */
export function PublishButton({ locale, onClick, refreshToken, blocked = false }: PublishButtonProps) {
  const [summary, setSummary] = useState<GitWorkingTreeSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    let timer: number | null = null

    const refresh = async () => {
      try {
        const snap = await window.emprint.git.workingTree()
        if (cancelled) return
        setSummary(snap)
      } catch {
        if (cancelled) return
        setSummary(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void refresh()
    timer = window.setInterval(() => {
      void refresh()
    }, POLL_INTERVAL_MS)

    // Catch external mutations as soon as the user comes back to the window.
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void refresh()
    }
    const onFocus = () => {
      void refresh()
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('focus', onFocus)

    return () => {
      cancelled = true
      if (timer !== null) window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('focus', onFocus)
    }
  }, [refreshToken])

  const pendingCount = summary?.pendingFiles.length ?? 0
  const aheadCount = summary?.ahead ?? 0
  // "Anything to publish" is the union of unsaved changes and previously
  // saved-but-not-shipped commits. Both look the same to the user: there's
  // work that hasn't been shared yet.
  const hasWork = pendingCount > 0 || aheadCount > 0
  // We surface only the unsaved file count; rolled-up local commits become
  // an additional "+N" so the user knows there's slightly more queued up,
  // without bringing git terminology into it.
  const displayCount = pendingCount

  const tooltip = blocked
    ? t(locale, 'Save your changes before publishing', '발행 전에 먼저 저장해주세요')
    : t(locale, 'Publish your changes', '변경사항 발행')

  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={blocked}
      aria-disabled={blocked}
      className="h-auto w-full justify-between gap-2 px-3 py-2 text-left text-[12px]"
      title={tooltip}
      aria-label={tooltip}
    >
      <span className="flex min-w-0 items-center gap-2">
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} aria-hidden />
        ) : (
          <ArrowUpFromLine className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
        )}
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="text-[12px] font-semibold">{t(locale, 'Publish', '발행')}</span>
          <span className="truncate text-[10px] font-normal opacity-80">
            {blocked
              ? t(locale, 'Unsaved changes', '저장되지 않은 변경')
              : hasWork
                ? pendingCount > 0
                  ? locale === 'ko'
                    ? `${pendingCount}개의 변경${aheadCount > 0 ? ' · 미발행 있음' : ''}`
                    : `${pendingCount} change${pendingCount === 1 ? '' : 's'}${aheadCount > 0 ? ' · unpublished' : ''}`
                  : t(locale, 'Unpublished updates', '아직 발행되지 않음')
                : t(locale, 'All caught up', '모두 발행됨')}
          </span>
        </span>
      </span>

      {hasWork && displayCount > 0 ? (
        <Badge className="border-[#160d07]/30 bg-[#160d07]/15 text-[#160d07]">
          {displayCount}
        </Badge>
      ) : null}
    </Button>
  )
}
