import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2 } from 'lucide-react'
import { pick } from '@renderer/lib/i18n'
import type { AppLocale, GitHubDeployPhase, GitHubDeployStatus } from '@emprint/shared'
import { Button } from '@renderer/components/ui/button'


const POLL_INTERVAL_MS = 8_000
const MAX_POLL_MS = 10 * 60_000

function phaseLabel(locale: AppLocale, phase: GitHubDeployPhase): string {
  switch (phase) {
    case 'queued':
      return pick(locale, 'Waiting to build…', '빌드 대기 중…')
    case 'in_progress':
      return pick(locale, 'Building your live site…', '배포본을 빌드하는 중…')
    case 'live':
      return pick(locale, 'Live site is up to date', '배포본이 최신 상태입니다')
    case 'failed':
      return pick(locale, 'Build or deploy failed', '빌드 또는 배포에 실패했습니다')
    case 'no_session':
      return pick(locale, 'Sign in to track deploy status', '배포 상태를 보려면 로그인하세요')
    case 'no_remote':
      return pick(locale, 'No GitHub remote configured', 'GitHub 원격이 설정되지 않았습니다')
    default:
      return pick(locale, 'Checking deploy status…', '배포 상태 확인 중…')
  }
}

function pipelineTimingNotice(locale: AppLocale): string {
  return pick(
    locale,
    'Your publish is being applied to the live site. This may take a few minutes.',
    '만든 흔적을 실제 사이트에 반영하는 중입니다. 완료까지 몇 분 걸릴 수 있습니다.'
  )
}

function phaseDetail(locale: AppLocale, status: GitHubDeployStatus): string | null {
  if (status.message && status.phase !== 'queued' && status.phase !== 'in_progress') {
    return status.message
  }
  switch (status.phase) {
    case 'queued':
    case 'in_progress':
      return pick(
        locale,
        'You can close this dialog — your publish is already saved.',
        '이 창을 닫아도 발행 기록은 이미 저장되었습니다.'
      )
    case 'live':
      return pick(locale, 'Visitors should see your latest publish shortly.', '방문자도 곧 최신 발행을 볼 수 있습니다.')
    case 'failed':
      return pick(
        locale,
        'The build or deploy did not finish successfully. Try publishing again in a few minutes.',
        '빌드 또는 배포가 끝나지 않았습니다. 잠시 후 다시 발행해 보세요.'
      )
    default:
      return null
  }
}

function showPipelineTimingNotice(phase: GitHubDeployPhase): boolean {
  return phase === 'queued' || phase === 'in_progress' || phase === 'unknown'
}

interface DeployStatusPanelProps {
  locale: AppLocale
  active: boolean
}

export function DeployStatusPanel({ locale, active }: DeployStatusPanelProps) {
  const [status, setStatus] = useState<GitHubDeployStatus | null>(null)
  const [polling, setPolling] = useState(false)
  const startedAtRef = useRef<number | null>(null)

  useEffect(() => {
    if (!active) {
      setStatus(null)
      setPolling(false)
      startedAtRef.current = null
      return
    }

    let cancelled = false
    let timer: number | null = null
    startedAtRef.current = Date.now()

    const stopPolling = () => {
      if (timer !== null) {
        window.clearInterval(timer)
        timer = null
      }
      setPolling(false)
    }

    const poll = async () => {
      if (cancelled) return
      setPolling(true)
      try {
        const snap = await window.emprint.github.deployStatus()
        if (cancelled) return
        setStatus(snap)
        if (
          snap.phase === 'live' ||
          snap.phase === 'failed' ||
          snap.phase === 'no_session' ||
          snap.phase === 'no_remote'
        ) {
          stopPolling()
          return
        }
        const started = startedAtRef.current ?? Date.now()
        if (Date.now() - started >= MAX_POLL_MS) {
          stopPolling()
        }
      } catch (caught) {
        if (cancelled) return
        const message = caught instanceof Error ? caught.message : String(caught)
        setStatus({ phase: 'unknown', message })
        stopPolling()
      }
    }

    void poll()
    timer = window.setInterval(() => {
      void poll()
    }, POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      stopPolling()
    }
  }, [active])

  if (!active) return null

  const phase = status?.phase ?? 'queued'
  const isSuccess = phase === 'live'
  const isFailure = phase === 'failed'
  const isPending = phase === 'queued' || phase === 'in_progress' || phase === 'unknown'

  return (
    <div className="space-y-2 rounded-md border border-border bg-panel px-3 py-2.5">
      <div className="flex items-start gap-2">
        {isPending || polling ? (
          <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-muted" strokeWidth={2} aria-hidden />
        ) : isSuccess ? (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={2} aria-hidden />
        ) : isFailure ? (
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-dangerInk" strokeWidth={2} aria-hidden />
        ) : (
          <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-muted" strokeWidth={2} aria-hidden />
        )}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="text-[12px] font-medium text-ink">{phaseLabel(locale, phase)}</div>
          {showPipelineTimingNotice(phase) ? (
            <p className="text-[11px] leading-relaxed text-muted">{pipelineTimingNotice(locale)}</p>
          ) : null}
          {status ? (
            phaseDetail(locale, status) ? (
              <p className="text-[11px] leading-relaxed text-muted">{phaseDetail(locale, status)}</p>
            ) : null
          ) : (
            <p className="text-[11px] leading-relaxed text-muted">
              {pick(locale, 'Checking the deploy pipeline…', '배포 파이프라인을 확인하는 중…')}
            </p>
          )}
        </div>
      </div>

      {status?.pagesUrl ? (
        <div className="pl-6">
          <Button
            type="button"
            variant="outline"
            className="h-7 gap-1 px-2 text-[10px]"
            onClick={() => window.open(status.pagesUrl, '_blank')}
          >
            <ExternalLink className="h-3 w-3" strokeWidth={2} aria-hidden />
            {pick(locale, 'Open live site', '배포본 열기')}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
