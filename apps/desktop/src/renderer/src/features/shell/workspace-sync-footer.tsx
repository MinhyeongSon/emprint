import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowDownToLine, ArrowUpFromLine, Loader2, RefreshCw } from 'lucide-react'
import { pick } from '@renderer/lib/i18n'
import type { AppLocale, GitPullSkipReason, GitWorkingTreeSummary } from '@emprint/shared'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import { useAppStore } from '@renderer/state/app-store'
import { PullOverwriteDialog } from './pull-overwrite-dialog'
import { ResetDraftDialog } from './reset-draft-dialog'


function pullBlockedLabel(locale: AppLocale, reason: GitPullSkipReason | undefined): string {
  switch (reason) {
    case 'no-session':
      return pick(locale, 'Sign in with GitHub to update', '업데이트하려면 GitHub 로그인')
    case 'dirty-tree':
      return pick(locale, 'Save local changes first', '먼저 로컬 변경을 저장하세요')
    case 'diverged':
      return pick(locale, 'Publish or resolve local commits first', '먼저 발행하거나 로컬 커밋을 정리하세요')
    case 'off-branch':
      return pick(locale, 'Switch to main first', '먼저 main 브랜치로 이동하세요')
    case 'conflict':
      return pick(locale, 'Resolve conflicts first', '먼저 충돌을 해결하세요')
    default:
      return pick(locale, 'Cannot update yet', '아직 업데이트할 수 없습니다')
  }
}

interface WorkspaceSyncFooterProps {
  locale: AppLocale
  refreshToken?: number
  blocked?: boolean
  onPublishClick(): void
  onSyncChange?(): void
  onWorkingStateRestored?(): void
}

const POLL_INTERVAL_MS = 60_000

export function WorkspaceSyncFooter({
  locale,
  refreshToken,
  blocked = false,
  onPublishClick,
  onSyncChange,
  onWorkingStateRestored
}: WorkspaceSyncFooterProps) {
  const activeWorkspaceId = useAppStore((s) => s.activeWorkspaceId)
  const startWorkspaceRecovery = useAppStore((s) => s.startWorkspaceRecovery)
  const workspaceGitRefreshToken = useAppStore((s) => s.workspaceGitRefreshToken)
  const activeDocumentDirty = useAppStore((s) => s.activeDocumentDirty)
  const bumpWorkspaceGitRefresh = useAppStore((s) => s.bumpWorkspaceGitRefresh)
  const prevDocumentDirtyRef = useRef(activeDocumentDirty)

  const [summary, setSummary] = useState<GitWorkingTreeSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [pullBusy, setPullBusy] = useState(false)
  const [overwriteOpen, setOverwriteOpen] = useState(false)
  const [resetDraftOpen, setResetDraftOpen] = useState(false)
  const [resetDraftBusy, setResetDraftBusy] = useState(false)
  const [branchNoticeDismissed, setBranchNoticeDismissed] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const snap = await window.emprint.git.workingTree()
      setSummary(snap)
      if (!snap.branchCorrected) {
        setBranchNoticeDismissed(false)
      }
    } catch {
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    let timer: number | null = null

    const run = async () => {
      if (cancelled) return
      setLoading(true)
      await refresh()
    }

    void run()
    timer = window.setInterval(() => {
      void refresh()
    }, POLL_INTERVAL_MS)

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
  }, [refresh, refreshToken, workspaceGitRefreshToken])

  // After Save, git sees new changes but we only polled on focus — refresh when dirty clears.
  useEffect(() => {
    const wasDirty = prevDocumentDirtyRef.current
    prevDocumentDirtyRef.current = activeDocumentDirty
    if (wasDirty && !activeDocumentDirty) {
      void refresh()
    }
  }, [activeDocumentDirty, refresh])

  const runPull = async (discardLocal: boolean) => {
    if (pullBusy) return
    setPullBusy(true)
    try {
      const result = await window.emprint.git.pull(discardLocal ? { discardLocal: true } : undefined)
      if (result.pulled) {
        setOverwriteOpen(false)
        await refresh()
        bumpWorkspaceGitRefresh()
        onSyncChange?.()
      } else if (result.skippedReason === 'conflict') {
        await refresh()
      }
    } finally {
      setPullBusy(false)
    }
  }

  const handleResetDraftConfirm = async () => {
    if (resetDraftBusy) return
    setResetDraftBusy(true)
    try {
      await window.emprint.git.resetDraft()
      setResetDraftOpen(false)
      await refresh()
      bumpWorkspaceGitRefresh()
      onSyncChange?.()
      onWorkingStateRestored?.()
    } finally {
      setResetDraftBusy(false)
    }
  }

  const handlePullClick = () => {
    if (pullBusy || !summary) return
    if (summary.canPullOverwrite && !summary.canPull) {
      setOverwriteOpen(true)
      return
    }
    if (summary.canPull) {
      void runPull(false)
    }
  }

  const handleRecover = () => {
    if (!activeWorkspaceId) return
    void startWorkspaceRecovery(activeWorkspaceId)
  }

  const pendingCount = summary?.pendingFiles.length ?? 0
  const aheadCount = summary?.ahead ?? 0
  const behindCount = summary?.behind ?? 0
  const hasWork = pendingCount > 0 || aheadCount > 0
  const displayCount = pendingCount
  const showRemoteUpdates = Boolean(summary?.hasRemote && behindCount > 0)
  const showConflict = Boolean(summary?.hasConflicts && behindCount === 0)
  const canUpdate = Boolean(summary?.canPull || summary?.canPullOverwrite)
  const updateEnabled = Boolean(canUpdate && (!blocked || summary?.canPullOverwrite))
  const showBranchNotice =
    Boolean(summary?.branchCorrected && !branchNoticeDismissed) ||
    Boolean(summary?.offPublishBranch && !summary?.hasConflicts)

  const publishSubtitle = () => {
    if (blocked) {
      return pick(locale, 'Unsaved changes', '저장되지 않은 변경')
    }
    if (showConflict) {
      return pick(locale, 'Needs recovery', '복구 필요')
    }
    if (behindCount > 0) {
      return pick(
        locale,
        `${behindCount} update${behindCount === 1 ? '' : 's'} on live site`,
        `배포본에 업데이트 ${behindCount}건`
      )
    }
    if (hasWork) {
      if (pendingCount > 0) {
        return locale === 'ko'
          ? `${pendingCount}개의 변경${aheadCount > 0 ? ' · 미발행 있음' : ''}`
          : `${pendingCount} change${pendingCount === 1 ? '' : 's'}${aheadCount > 0 ? ' · unpublished' : ''}`
      }
      return pick(locale, 'Unpublished updates', '아직 발행되지 않음')
    }
    return pick(locale, 'All caught up', '모두 발행됨')
  }

  const publishTooltip = blocked
    ? pick(locale, 'Save your changes before publishing', '발행 전에 먼저 저장해주세요')
    : showConflict
      ? pick(locale, 'Restore the workspace before publishing', '발행 전에 워크스페이스를 복구하세요')
      : behindCount > 0
        ? pick(locale, 'Remote updates available — update or publish', '원격 업데이트 있음 — 가져오기 또는 발행')
        : pick(locale, 'Publish your changes', '변경사항 발행')

  return (
    <div className="space-y-2">
      {showBranchNotice && summary ? (
        <div className="rounded-md border border-border bg-surface px-3 py-2 text-[10px] leading-relaxed text-muted">
          {summary.branchCorrected ? (
            <p>
              {pick(
                locale,
                'External changes to this repository were detected. Emprint switched you back to the main line.',
                '클라이언트 외부에서 변경된 것이 감지되어 main 브랜치로 자동 복구했습니다.'
              )}
            </p>
          ) : (
            <p>
              {pick(
                locale,
                'This folder is not on the main line Emprint uses. Save or discard local changes, then reopen the workspace.',
                'Emprint가 사용하는 main 브랜치가 아닙니다. 로컬 변경을 정리한 뒤 다시 열어주세요.'
              )}
            </p>
          )}
          {summary.branchCorrected ? (
            <button
              type="button"
              className="mt-1 text-[10px] text-ink underline opacity-80"
              onClick={() => setBranchNoticeDismissed(true)}
            >
              {pick(locale, 'Dismiss', '닫기')}
            </button>
          ) : null}
        </div>
      ) : null}

      {showConflict ? (
        <div className="rounded-md border border-[#e85d04]/40 bg-[#e85d04]/10 px-3 py-2.5">
          <p className="text-[10px] leading-relaxed text-ink">
            {pick(
              locale,
              'A conflict occurred between your live site and this workspace. Differences between the deployed page and Imprint can cause this. Work you had in progress may be lost.',
              '배포된 웹페이지와 Imprint 사이의 차이로 충돌이 발생했습니다. 진행 중이던 작업 내용이 사라질 수 있습니다.'
            )}
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-2 h-8 w-full gap-1.5 text-[11px]"
            onClick={handleRecover}
          >
            <RefreshCw className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            {pick(locale, 'Restore from remote', '원격에서 복구')}
          </Button>
        </div>
      ) : null}

      {showRemoteUpdates ? (
        <Button
          type="button"
          variant="outline"
          disabled={!updateEnabled || pullBusy}
          className="h-auto w-full justify-between gap-2 border-[#e85d04]/50 px-3 py-2 text-left text-[12px]"
          title={
            updateEnabled
              ? pick(locale, 'Pull updates from the live site', '배포본에서 업데이트 가져오기')
              : pullBlockedLabel(locale, summary?.pullBlockedReason)
          }
          onClick={handlePullClick}
        >
          <span className="flex min-w-0 items-center gap-2">
            {pullBusy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} aria-hidden />
            ) : (
              <ArrowDownToLine className="h-3.5 w-3.5 shrink-0 text-[#e85d04]" strokeWidth={2} aria-hidden />
            )}
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="text-[12px] font-semibold text-ink">{pick(locale, 'Update', '업데이트')}</span>
              <span className="truncate text-[10px] font-normal text-muted">
                {updateEnabled
                  ? summary?.canPullOverwrite && !summary.canPull
                    ? pick(locale, 'May replace local edits', '로컬 변경을 덮어씁니다')
                    : pick(
                        locale,
                        `${behindCount} update${behindCount === 1 ? '' : 's'} from the live site`,
                        `배포본에서 ${behindCount}건 가져오기`
                      )
                  : pullBlockedLabel(locale, summary?.pullBlockedReason)}
              </span>
            </span>
          </span>
          <Badge className="border-[#e85d04]/40 bg-[#e85d04]/15 text-[#a34e00]">{behindCount}</Badge>
        </Button>
      ) : null}

      {pendingCount > 0 ? (
        <Button
          type="button"
          variant="ghost"
          disabled={blocked || resetDraftBusy}
          className="h-8 w-full text-[11px] text-muted hover:text-ink"
          title={
            blocked
              ? pick(locale, 'Save your changes before resetting', '되돌리기 전에 먼저 저장하세요')
              : pick(locale, 'Discard uncommitted changes', '발행하지 않은 변경 버리기')
          }
          onClick={() => setResetDraftOpen(true)}
        >
          {pick(locale, 'Reset draft', '초안 되돌리기')}
        </Button>
      ) : null}

      <Button
        type="button"
        onClick={onPublishClick}
        disabled={blocked || (showConflict && !canUpdate)}
        aria-disabled={blocked || (showConflict && !canUpdate)}
        className="h-auto w-full justify-between gap-2 px-3 py-2 text-left text-[12px]"
        title={publishTooltip}
        aria-label={publishTooltip}
      >
        <span className="flex min-w-0 items-center gap-2">
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} aria-hidden />
          ) : (
            <ArrowUpFromLine className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
          )}
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="text-[12px] font-semibold">{pick(locale, 'Publish', '발행')}</span>
            <span className="truncate text-[10px] font-normal opacity-80">{publishSubtitle()}</span>
          </span>
        </span>

        {hasWork && displayCount > 0 && behindCount === 0 ? (
          <Badge className="border-[#160d07]/30 bg-[#160d07]/15 text-[#160d07]">{displayCount}</Badge>
        ) : behindCount > 0 && !showRemoteUpdates ? null : null}
      </Button>

      <PullOverwriteDialog
        open={overwriteOpen}
        locale={locale}
        behind={behindCount}
        busy={pullBusy}
        onCancel={() => {
          if (!pullBusy) setOverwriteOpen(false)
        }}
        onConfirm={() => void runPull(true)}
      />

      <ResetDraftDialog
        open={resetDraftOpen}
        locale={locale}
        busy={resetDraftBusy}
        onCancel={() => {
          if (!resetDraftBusy) setResetDraftOpen(false)
        }}
        onConfirm={() => void handleResetDraftConfirm()}
      />
    </div>
  )
}
