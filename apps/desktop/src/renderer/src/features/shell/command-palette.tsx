import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import type { AppLocale } from '@emprint/shared'
import { cn } from '@renderer/lib/cn'
import { getLocaleMessages } from '@renderer/lib/i18n'

export interface CommandPaletteItem {
  id: string
  label: string
  hint: string
  meta?: string
  disabled?: boolean
  onSelect?(): void
}

interface CommandPaletteProps {
  items: CommandPaletteItem[]
  locale: AppLocale
  onClose(): void
  open: boolean
}

export function CommandPalette({ items, locale, onClose, open }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const m = getLocaleMessages(locale)

  useEffect(() => {
    if (!open) {
      setQuery('')
    }
  }, [open])

  if (!open) {
    return null
  }

  const normalizedQuery = query.trim().toLowerCase()
  const filteredItems = items.filter((item) => {
    if (!normalizedQuery) {
      return true
    }

    return [item.label, item.hint, item.meta]
      .filter(Boolean)
      .some((value) => value?.toLowerCase().includes(normalizedQuery))
  })

  return (
    <div
      className="emprint-scrim emprint-scrim-command fixed inset-0 z-50 flex items-start justify-center px-4 py-16 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="emprint-command-palette w-full max-w-2xl overflow-hidden rounded-lg border border-border bg-panel shadow-panel"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-border bg-panel px-4 py-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-xs uppercase tracking-[0.18em] text-ink/70">{m.shell.commandPalette}</div>
            <button
              type="button"
              aria-label="Close"
              title="Close"
              onClick={onClose}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted transition hover:border-accent/40 hover:text-ink"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2.25} />
            </button>
          </div>
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={m.shell.commandPalettePlaceholder}
            className="w-full rounded-md border border-border bg-panel2 px-3 py-2.5 text-sm text-ink outline-none transition placeholder:text-muted/80 focus:border-accent/60 focus:ring-1 focus:ring-accent/40"
          />
        </div>

        <div className="max-h-[420px] overflow-auto p-2">
          {filteredItems.length === 0 ? (
            <div className="rounded-md border border-dashed border-border px-3 py-8 text-center text-sm text-muted">
              {m.shell.commandPaletteEmpty}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  disabled={item.disabled}
                  onClick={() => {
                    item.onSelect?.()
                    onClose()
                  }}
                  className={cn(
                    'flex w-full items-start justify-between rounded-md border px-3 py-2 text-left transition duration-150',
                    item.disabled
                      ? 'cursor-not-allowed border-transparent opacity-55'
                      : 'border-transparent hover:border-border hover:bg-panel2'
                  )}
                >
                  <div>
                    <div className="text-sm font-medium text-ink">{item.label}</div>
                    <div className="mt-1 text-xs leading-5 text-muted">{item.hint}</div>
                  </div>
                  {item.meta ? (
                    <span className="ml-4 rounded-sm border border-border bg-panel2 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.16em] text-muted">
                      {item.meta}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
