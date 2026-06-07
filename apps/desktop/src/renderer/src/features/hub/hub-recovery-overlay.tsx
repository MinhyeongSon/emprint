import { Loader2 } from 'lucide-react'
import { pick } from '@renderer/lib/i18n'
import type { AppLocale } from '@emprint/shared'
import { useAppStore } from '@renderer/state/app-store'


interface HubRecoveryOverlayProps {
  locale: AppLocale
}

export function HubRecoveryOverlay({ locale }: HubRecoveryOverlayProps) {
  const hubRecovery = useAppStore((s) => s.hubRecovery)
  if (!hubRecovery) return null

  const pct = Math.max(0, Math.min(100, hubRecovery.progress))

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-base/90 px-6 backdrop-blur-sm">
      <div className="w-full max-w-md space-y-4 rounded-lg border border-border bg-surface p-6 shadow-lg">
        <div className="space-y-1 text-center">
          <div className="text-sm font-semibold text-ink">
            {pick(locale, 'Restoring anthology', '앤솔로지 복구 중')}
          </div>
          <p className="text-xs text-muted">{hubRecovery.title}</p>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-panel2">
          <div
            className="h-full rounded-full bg-[#e85d04] transition-[width] duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-muted">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          <span>{hubRecovery.message}</span>
        </div>

        <p className="text-center text-[10px] leading-relaxed text-muted">
          {pick(
            locale,
            'Your local copy was removed and is being downloaded again from GitHub. You will return to the Hub when finished.',
            '로컬 복사본을 삭제한 뒤 GitHub에서 다시 받고 있습니다. 완료되면 Hub로 돌아옵니다.'
          )}
        </p>
      </div>
    </div>
  )
}
