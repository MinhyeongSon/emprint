import { pick } from '@renderer/lib/i18n'
import type { AppLocale, SiteDevServerState } from '@emprint/shared'
import { Card } from '@renderer/components/ui/card'
import { cn } from '@renderer/lib/cn'


function phaseLabel(locale: AppLocale, state: SiteDevServerState): string {
  if (state.phase === 'installing') {
    return pick(
      locale,
      'Gathering what we need for your preview…',
      '미리 보기 생성에 필요한 것들을 찾아오는 중…'
    )
  }
  if (state.phase === 'starting-dev') {
    return pick(locale, 'Building your site layout…', '홈페이지 형태로 구성하는 중…')
  }
  if (state.phase === 'opening-browser') {
    return pick(locale, 'Opening your preview…', '미리 보기를 여는 중…')
  }
  return pick(locale, 'Preparing your preview…', '미리 보기를 준비하는 중…')
}

function phaseDetail(locale: AppLocale, state: SiteDevServerState): string {
  if (state.phase === 'installing') {
    return pick(
      locale,
      'This may take a minute the first time. We are downloading the site toolkit.',
      '처음 한 번은 시간이 걸릴 수 있어요. 사이트를 만드는 도구를 받아오고 있습니다.'
    )
  }
  if (state.phase === 'starting-dev') {
    return pick(
      locale,
      'Turning your posts and design into a browsable page.',
      '글과 디자인을 모아 브라우저에서 볼 수 있는 페이지로 만듭니다.'
    )
  }
  if (state.phase === 'opening-browser') {
    return pick(
      locale,
      'Your browser will open when everything is ready.',
      '준비가 끝나면 브라우저가 자동으로 열립니다.'
    )
  }
  return pick(locale, 'Almost there…', '거의 다 됐어요…')
}

export function DesignPreviewProgress({
  locale,
  state
}: {
  locale: AppLocale
  state: SiteDevServerState
}) {
  const indeterminate = typeof state.progress !== 'number'
  const value = typeof state.progress === 'number' ? Math.max(0, Math.min(100, state.progress)) : undefined
  const showTechnicalMessage =
    state.status === 'error' && state.message && !state.message.toLowerCase().includes('npm')

  return (
    <div className="border-b border-border bg-panel2/50 px-4 py-3">
      <Card className="space-y-2 border border-border bg-panel p-3">
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="font-medium text-ink">{phaseLabel(locale, state)}</span>
          {typeof value === 'number' ? (
            <span className="font-mono text-muted">{Math.round(value)}%</span>
          ) : null}
        </div>
        <progress
          className={cn(
            'h-2 w-full overflow-hidden rounded-full bg-panel2',
            '[&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-panel2',
            '[&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-accent',
            '[&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-accent'
          )}
          max={100}
          value={indeterminate ? undefined : value}
        />
        <p className="text-[11px] leading-snug text-muted">{phaseDetail(locale, state)}</p>
        {showTechnicalMessage ? (
          <p className="truncate text-[10px] leading-snug text-dangerInk" title={state.message}>
            {state.message}
          </p>
        ) : null}
      </Card>
    </div>
  )
}
