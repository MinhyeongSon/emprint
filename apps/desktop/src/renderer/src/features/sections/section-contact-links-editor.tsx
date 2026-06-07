import { Plus, Trash2 } from 'lucide-react'
import type { AppLocale, MemoirContactLink } from '@emprint/shared'
import { pick } from '@renderer/lib/i18n'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'

export function SectionContactLinksEditor({
  locale,
  links,
  onChange
}: {
  locale: AppLocale
  links: MemoirContactLink[]
  onChange: (links: MemoirContactLink[]) => void
}) {
  const update = (index: number, patch: Partial<MemoirContactLink>) => {
    const next = links.map((link, i) => (i === index ? { ...link, ...patch } : link))
    onChange(next)
  }

  const remove = (index: number) => {
    onChange(links.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-2">
      <span className="text-xs font-medium text-ink">{pick(locale, 'Links', '링크')}</span>
      {links.length === 0 ? (
        <p className="text-xs text-muted">{pick(locale, 'No links yet.', '링크가 없습니다.')}</p>
      ) : (
        <ul className="space-y-2">
          {links.map((link, index) => (
            <li key={index} className="flex flex-wrap items-start gap-2 rounded-md border border-border bg-panel2/40 p-2">
              <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
                <Input
                  value={link.label}
                  placeholder={pick(locale, 'Label', '라벨')}
                  onChange={(e) => update(index, { label: e.target.value })}
                />
                <Input
                  value={link.url}
                  placeholder={pick(locale, 'https://…', 'https://…')}
                  onChange={(e) => update(index, { url: e.target.value })}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                className="h-8 w-8 shrink-0 text-dangerInk"
                aria-label={pick(locale, 'Remove link', '링크 삭제')}
                onClick={() => remove(index)}
              >
                <Trash2 className="h-4 w-4" strokeWidth={2} aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <Button
        type="button"
        variant="outline"
        className="h-8 gap-1.5 text-xs"
        onClick={() => onChange([...links, { label: '', url: '' }])}
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
        {pick(locale, 'Add link', '링크 추가')}
      </Button>
    </div>
  )
}
