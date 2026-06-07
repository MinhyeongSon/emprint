import { Card } from '@renderer/components/ui/card'
import { cn } from '@renderer/lib/cn'
import { PaletteSwatchStrip, TemplateCompositionWireframe } from './template-composition-wireframe'
import type { SiteProjectKind } from '@emprint/shared'

export function TemplateCompositionCard({
  selected,
  title,
  siteKind,
  compositionId,
  onSelect
}: {
  selected: boolean
  title: string
  siteKind: SiteProjectKind
  compositionId: string
  onSelect: () => void
}) {
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
      className={cn(
        'cursor-pointer space-y-2 border p-3 transition outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
        selected ? 'border-accent/50 bg-panel2/60' : 'border-border bg-panel hover:border-accent/30'
      )}
    >
      <div className="text-sm font-semibold text-ink">{title}</div>
      <TemplateCompositionWireframe siteKind={siteKind} compositionId={compositionId} />
    </Card>
  )
}

export function TemplatePaletteCard({
  selected,
  title,
  paletteId,
  onSelect
}: {
  selected: boolean
  title: string
  paletteId: string
  onSelect: () => void
}) {
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
      className={cn(
        'cursor-pointer border p-3 transition outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
        selected ? 'border-accent/50 bg-panel2/60' : 'border-border bg-panel hover:border-accent/30'
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-ink">{title}</div>
        <PaletteSwatchStrip paletteId={paletteId} />
      </div>
    </Card>
  )
}
