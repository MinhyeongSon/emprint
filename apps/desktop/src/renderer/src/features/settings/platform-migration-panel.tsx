import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { pick } from '@renderer/lib/i18n'
import type { AppLocale } from '@emprint/shared'
import { TistoryMigrationSection } from '@renderer/features/settings/tistory-migration-section'
import { MarkdownMigrationSection } from '@renderer/features/settings/markdown-migration-section'
import { cn } from '@renderer/lib/cn'


type MigrationPlatform = 'tistory' | 'markdown'

export function PlatformMigrationPanel({ locale }: { locale: AppLocale }) {
  const [open, setOpen] = useState(false)
  const [platform, setPlatform] = useState<MigrationPlatform>('markdown')

  return (
    <div className="rounded-lg border border-border bg-surface">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        aria-expanded={open}
        aria-label={
          open
            ? pick(locale, 'Collapse migration panel', '마이그레이션 패널 접기')
            : pick(locale, 'Expand migration panel', '마이그레이션 패널 펼치기')
        }
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-sm font-medium text-ink">
          {pick(locale, 'Migration from Other Platform', '다른 플랫폼에서 가져오기')}
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-muted" strokeWidth={2} aria-hidden />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted" strokeWidth={2} aria-hidden />
        )}
      </button>

      {open ? (
        <div className="space-y-4 border-t border-border px-4 pb-4 pt-3">
          <div className="text-[11px] uppercase tracking-[0.16em] text-muted">
            {pick(locale, 'Platform', '플랫폼')}
          </div>
          <div className="inline-flex rounded-md border border-border bg-panel p-0.5">
            {(['markdown', 'tistory'] as const).map((id) => (
              <button
                key={id}
                type="button"
                className={cn(
                  'rounded px-2.5 py-1 text-xs font-medium transition-colors',
                  platform === id ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'
                )}
                onClick={() => setPlatform(id)}
              >
                {id === 'markdown'
                  ? pick(locale, 'Markdown', 'Markdown')
                  : pick(locale, 'Tistory', '티스토리')}
              </button>
            ))}
          </div>

          {platform === 'markdown' ? (
            <MarkdownMigrationSection locale={locale} />
          ) : (
            <TistoryMigrationSection locale={locale} />
          )}
        </div>
      ) : null}
    </div>
  )
}
