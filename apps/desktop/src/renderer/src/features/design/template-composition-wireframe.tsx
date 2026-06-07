import type { SiteProjectKind } from '@emprint/shared'
import { cn } from '@renderer/lib/cn'
import {
  BookPagesPreview,
  BookScrollPreview,
  ColumnJournalPreview,
  ColumnMagazinePreview,
  ColumnReadingRoomPreview,
  DictionaryAtlasPreview,
  DictionaryGraphPreview,
  DictionaryReferencePreview,
  FragmentsGalleryPreview,
  FragmentsShelfPreview,
  MemoirEditorialPreview,
  MemoirGridPreview,
  MemoirLayoutPreview
} from '@renderer/features/hub/workspace-format-previews'

export function PaletteSwatchStrip({ paletteId }: { paletteId: string }) {
  const isPaper = paletteId === 'paperInk'
  return (
    <div className="flex gap-1" aria-hidden>
      <span
        className={cn('h-2 w-4 rounded-sm border border-border/60', isPaper ? 'bg-[#f5f5f0]' : 'bg-[#f3e8d8]')}
      />
      <span
        className={cn('h-2 w-4 rounded-sm border border-border/60', isPaper ? 'bg-[#1a1a1a]' : 'bg-[#3d3428]')}
      />
      <span
        className={cn(
          'h-2 w-4 rounded-sm border border-border/60',
          isPaper ? 'bg-[#666]' : 'bg-[#cd7b00]'
        )}
      />
    </div>
  )
}

export function TemplateCompositionWireframe({
  siteKind,
  compositionId
}: {
  siteKind: SiteProjectKind
  compositionId: string
}) {
  if (siteKind === 'memoir') {
    if (compositionId === 'grid') return <MemoirGridPreview />
    if (compositionId === 'editorial') return <MemoirEditorialPreview />
    return <MemoirLayoutPreview />
  }
  if (siteKind === 'book') {
    if (compositionId === 'scroll') return <BookScrollPreview />
    return <BookPagesPreview />
  }
  if (siteKind === 'fragments') {
    if (compositionId === 'gallery') return <FragmentsGalleryPreview />
    return <FragmentsShelfPreview />
  }
  if (siteKind === 'dictionary') {
    if (compositionId === 'graph') return <DictionaryGraphPreview />
    if (compositionId === 'atlas') return <DictionaryAtlasPreview />
    return <DictionaryReferencePreview />
  }
  if (compositionId === 'magazine') return <ColumnMagazinePreview />
  if (compositionId === 'journal') return <ColumnJournalPreview />
  return <ColumnReadingRoomPreview />
}
