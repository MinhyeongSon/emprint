import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { GripVertical, ImageOff, Loader2, Plus, RefreshCw, Save, Tag, Trash2 } from 'lucide-react'
import {
  MAX_FRAGMENTS_ARTWORK_COUNT,
  parseArtworkTagsInput,
  type AppLocale,
  type ArtworkImageInfo
} from '@emprint/shared'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import { Card } from '@renderer/components/ui/card'
import { Input } from '@renderer/components/ui/input'
import { pick } from '@renderer/lib/i18n'
import { workspaceAssetPathToAssetUrl } from '@renderer/lib/asset-paths'
import { useAppStore } from '@renderer/state/app-store'
import { cn } from '@renderer/lib/cn'

const ACCEPT = 'image/jpeg,image/png,image/webp,image/*'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function tagsToDraft(tags: string[] | undefined): string {
  return tags?.join(', ') ?? ''
}

export function ArtworkSurface({ locale }: { locale: AppLocale }) {
  const bumpWorkspaceGitRefresh = useAppStore((state) => state.bumpWorkspaceGitRefresh)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<ArtworkImageInfo[]>([])
  const [album, setAlbum] = useState('')
  const [editAlbum, setEditAlbum] = useState('')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)
  const [reordering, setReordering] = useState(false)
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null)
  const [tagPickerOpen, setTagPickerOpen] = useState(false)

  const [editTitle, setEditTitle] = useState('')
  const [editCaption, setEditCaption] = useState('')
  const [editYear, setEditYear] = useState('')
  const [editMedium, setEditMedium] = useState('')
  const [editTags, setEditTags] = useState('')
  const [savingMeta, setSavingMeta] = useState(false)
  const [savingAlbum, setSavingAlbum] = useState(false)

  const load = useCallback(async () => {
    if (!window.emprint?.artwork?.list) {
      setError(pick(locale, 'Artwork API unavailable.', '작품 API를 사용할 수 없습니다.'))
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const result = await window.emprint.artwork.list()
      setItems(result.items)
      const nextAlbum = result.album ?? ''
      setAlbum(nextAlbum)
      setEditAlbum(nextAlbum)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to load artwork.')
    } finally {
      setLoading(false)
    }
  }, [locale])

  useEffect(() => {
    void load()
  }, [load])

  const selectedItem = items.find((i) => i.id === selected) ?? null

  useEffect(() => {
    if (!selectedItem) {
      setEditTitle('')
      setEditCaption('')
      setEditYear('')
      setEditMedium('')
      setEditTags('')
      return
    }
    setEditTitle(selectedItem.title)
    setEditCaption(selectedItem.caption ?? '')
    setEditYear(selectedItem.year != null ? String(selectedItem.year) : '')
    setEditMedium(selectedItem.medium ?? '')
    setEditTags(tagsToDraft(selectedItem.tags))
  }, [selectedItem])

  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const item of items) {
      for (const tag of item.tags ?? []) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1)
      }
    }
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [items])

  const filteredItems = useMemo(() => {
    if (!selectedTagFilter) return items
    return items.filter((item) => item.tags?.includes(selectedTagFilter))
  }, [items, selectedTagFilter])

  const atLimit = items.length >= MAX_FRAGMENTS_ARTWORK_COUNT
  const parsedEditYear = editYear.trim() ? Number(editYear.trim()) : null
  const parsedEditTags = parseArtworkTagsInput(editTags)
  const metaDirty =
    selectedItem != null &&
    (editTitle.trim() !== selectedItem.title ||
      editCaption.trim() !== (selectedItem.caption ?? '') ||
      (parsedEditYear ?? undefined) !== (selectedItem.year ?? undefined) ||
      editMedium.trim() !== (selectedItem.medium ?? '') ||
      parsedEditTags.join('|') !== (selectedItem.tags ?? []).join('|'))
  const albumDirty = editAlbum.trim() !== album.trim()

  const handlePickFiles = useCallback(() => {
    if (atLimit) return
    fileInputRef.current?.click()
  }, [atLimit])

  const handleFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList?.length || !window.emprint?.artwork?.save) return
      if (atLimit) {
        setError(
          pick(
            locale,
            `Maximum ${MAX_FRAGMENTS_ARTWORK_COUNT} artworks.`,
            `작품은 최대 ${MAX_FRAGMENTS_ARTWORK_COUNT}개까지입니다.`
          )
        )
        return
      }
      setUploading(true)
      setError(null)
      try {
        let count = items.length
        for (const file of Array.from(fileList)) {
          if (count >= MAX_FRAGMENTS_ARTWORK_COUNT) break
          const bytes = new Uint8Array(await file.arrayBuffer())
          await window.emprint.artwork.save({
            fileName: file.name,
            data: bytes,
            mimeType: file.type || 'application/octet-stream'
          })
          count++
        }
        bumpWorkspaceGitRefresh()
        await load()
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Upload failed.')
      } finally {
        setUploading(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    },
    [atLimit, bumpWorkspaceGitRefresh, items.length, load, locale]
  )

  const handleDelete = useCallback(
    async (item: ArtworkImageInfo) => {
      if (!window.emprint?.artwork?.delete) return
      setDeleting(item.id)
      try {
        await window.emprint.artwork.delete({ id: item.id })
        bumpWorkspaceGitRefresh()
        if (selected === item.id) setSelected(null)
        await load()
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Delete failed.')
      } finally {
        setDeleting(null)
      }
    },
    [bumpWorkspaceGitRefresh, load, selected]
  )

  const handleSaveMeta = useCallback(async () => {
    if (!selectedItem || !window.emprint?.artwork?.update) return
    setSavingMeta(true)
    setError(null)
    try {
      const yearRaw = editYear.trim()
      await window.emprint.artwork.update({
        id: selectedItem.id,
        title: editTitle.trim() || selectedItem.title,
        caption: editCaption.trim(),
        year: yearRaw ? Number(yearRaw) : null,
        medium: editMedium.trim(),
        tags: parsedEditTags
      })
      bumpWorkspaceGitRefresh()
      await load()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Save failed.')
    } finally {
      setSavingMeta(false)
    }
  }, [
    bumpWorkspaceGitRefresh,
    editCaption,
    editMedium,
    editTitle,
    editYear,
    load,
    parsedEditTags,
    selectedItem
  ])

  const handleSaveAlbum = useCallback(async () => {
    if (!window.emprint?.artwork?.updateAlbum) return
    setSavingAlbum(true)
    setError(null)
    try {
      const result = await window.emprint.artwork.updateAlbum({ album: editAlbum.trim() })
      setItems(result.items)
      const nextAlbum = result.album ?? ''
      setAlbum(nextAlbum)
      setEditAlbum(nextAlbum)
      bumpWorkspaceGitRefresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Save failed.')
    } finally {
      setSavingAlbum(false)
    }
  }, [bumpWorkspaceGitRefresh, editAlbum])

  const reorderItems = useCallback(
    async (sourceId: string, targetId: string) => {
      if (sourceId === targetId || !window.emprint?.artwork?.reorder) return
      const ids = items.map((i) => i.id)
      const from = ids.indexOf(sourceId)
      const to = ids.indexOf(targetId)
      if (from < 0 || to < 0) return
      const next = [...ids]
      const [moved] = next.splice(from, 1)
      if (!moved) return
      next.splice(to, 0, moved)
      setReordering(true)
      setError(null)
      try {
        const updated = await window.emprint.artwork.reorder({ orderedIds: next })
        setItems(updated)
        bumpWorkspaceGitRefresh()
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Reorder failed.')
        await load()
      } finally {
        setReordering(false)
        setDragId(null)
        setDropTargetId(null)
      }
    },
    [bumpWorkspaceGitRefresh, items, load]
  )

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-8 lg:px-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-muted">
            {pick(locale, 'Artwork', '작품')}
          </div>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-ink">
            {pick(locale, 'Gallery shelf', '선반 갤러리')}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {pick(
              locale,
              `JPEG, PNG, WebP → stored as JPEG · up to ${MAX_FRAGMENTS_ARTWORK_COUNT} pieces · drag to reorder · published on your site shelf.`,
              `JPEG·PNG·WebP 업로드(저장은 JPEG) · 최대 ${MAX_FRAGMENTS_ARTWORK_COUNT}점 · 드래그로 순서 변경 · 공개 사이트 선반에 표시됩니다.`
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" className="px-2 py-1.5" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      <Card className="mb-4 border-border bg-panel2/40 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 space-y-1.5">
            <label className="text-[11px] uppercase tracking-wide text-muted" htmlFor="artwork-album">
              {pick(locale, 'Album title (optional)', '앨범 제목 (선택)')}
            </label>
            <Input
              id="artwork-album"
              data-testid="artwork-edit-album"
              value={editAlbum}
              onChange={(e) => setEditAlbum(e.target.value)}
              placeholder={pick(locale, 'e.g. Summer sketches 2024', '예: 2024 여름 스케치')}
            />
            <p className="text-xs text-muted">
              {pick(
                locale,
                'Shown on your public gallery when set. One flat album for this anthology.',
                '설정 시 공개 갤러리에 표시됩니다. 이 앤솔로지당 하나의 앨범 제목입니다.'
              )}
            </p>
          </div>
          <Button
            type="button"
            disabled={!albumDirty || savingAlbum}
            onClick={() => void handleSaveAlbum()}
          >
            {savingAlbum ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="mr-1.5 h-3.5 w-3.5" />
            )}
            {pick(locale, 'Save album', '앨범 저장')}
          </Button>
        </div>
      </Card>

      {error ? (
        <Card className="mb-4 border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </Card>
      ) : null}

      {tagCounts.length > 0 ? (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className={cn(
              'px-2.5 py-1.5 text-xs',
              tagPickerOpen || selectedTagFilter ? 'border-accent/40 bg-panel2' : undefined
            )}
            aria-expanded={tagPickerOpen}
            data-testid="artwork-tag-picker-toggle"
            onClick={() => setTagPickerOpen((open) => !open)}
          >
            <Tag className="mr-1.5 h-3.5 w-3.5" />
            {pick(locale, 'Tags', '태그')}
          </Button>
          {!tagPickerOpen && selectedTagFilter ? (
            <>
              <Badge className="normal-case tracking-normal">{selectedTagFilter}</Badge>
              <Button
                type="button"
                variant="ghost"
                className="px-2.5 py-1.5 text-xs"
                onClick={() => setSelectedTagFilter(null)}
              >
                {pick(locale, 'Clear filter', '필터 해제')}
              </Button>
            </>
          ) : null}
        </div>
      ) : null}

      {tagPickerOpen && tagCounts.length > 0 ? (
        <div
          className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-panel2/40 p-3"
          data-testid="artwork-tag-filter"
        >
          <button
            type="button"
            className={cn(
              'rounded-full border px-2.5 py-1 text-xs transition',
              selectedTagFilter === null
                ? 'border-accent/50 bg-panel2 text-ink'
                : 'border-border text-muted hover:border-border hover:bg-panel2/70 hover:text-ink'
            )}
            onClick={() => setSelectedTagFilter(null)}
          >
            {pick(locale, 'All', '전체')} ({items.length})
          </button>
          {tagCounts.map(([tag, count]) => (
            <button
              key={tag}
              type="button"
              className={cn(
                'rounded-full border px-2.5 py-1 text-xs transition',
                selectedTagFilter === tag
                  ? 'border-accent/50 bg-panel2 text-ink'
                  : 'border-border text-muted hover:border-border hover:bg-panel2/70 hover:text-ink'
              )}
              onClick={() => setSelectedTagFilter(tag)}
            >
              {tag} ({count})
            </button>
          ))}
        </div>
      ) : null}

      <input
        ref={fileInputRef}
        data-testid="artwork-file-input"
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => void handleFiles(e.target.files)}
      />

      <div
        data-testid="artwork-grid"
        className={cn(
          'grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5',
          reordering && 'pointer-events-none opacity-70'
        )}
      >
        <button
          type="button"
          disabled={atLimit || uploading}
          onClick={handlePickFiles}
          className={cn(
            'titlebar-nodrag flex aspect-square flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-panel2 text-muted transition',
            'hover:border-accent/50 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
            (atLimit || uploading) && 'cursor-not-allowed opacity-50'
          )}
          aria-label={pick(locale, 'Add artwork', '작품 추가')}
        >
          {uploading ? (
            <Loader2 className="h-8 w-8 animate-spin" />
          ) : (
            <Plus className="h-8 w-8" strokeWidth={1.5} />
          )}
          <span className="text-xs font-medium">{pick(locale, 'Add', '추가')}</span>
        </button>

        {filteredItems.map((item) => {
          const url = workspaceAssetPathToAssetUrl(item.path)
          const isSelected = selected === item.id
          const isDropTarget = dropTargetId === item.id && dragId !== item.id
          return (
            <div
              key={item.id}
              data-testid={`artwork-tile-${item.id}`}
              draggable
              onDragStart={(e) => {
                setDragId(item.id)
                e.dataTransfer.effectAllowed = 'move'
                e.dataTransfer.setData('text/plain', item.id)
              }}
              onDragEnd={() => {
                setDragId(null)
                setDropTargetId(null)
              }}
              onDragOver={(e) => {
                e.preventDefault()
                if (dragId && dragId !== item.id) setDropTargetId(item.id)
              }}
              onDragLeave={() => {
                if (dropTargetId === item.id) setDropTargetId(null)
              }}
              onDrop={(e) => {
                e.preventDefault()
                const source = dragId ?? e.dataTransfer.getData('text/plain')
                if (source) void reorderItems(source, item.id)
              }}
              className={cn(
                'titlebar-nodrag group relative aspect-square overflow-hidden rounded-lg border bg-panel transition',
                isSelected ? 'border-accent ring-2 ring-accent/30' : 'border-border',
                isDropTarget && 'border-accent ring-2 ring-dashed ring-accent/50',
                dragId === item.id && 'opacity-50'
              )}
            >
              <button
                type="button"
                className="absolute left-1 top-1 z-10 rounded bg-black/45 p-0.5 text-white opacity-0 transition group-hover:opacity-100"
                aria-hidden
                tabIndex={-1}
              >
                <GripVertical className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                className="h-full w-full text-left"
                aria-label={pick(locale, `Artwork: ${item.title}`, `작품: ${item.title}`)}
                onClick={() => setSelected(isSelected ? null : item.id)}
              >
                <img
                  src={url}
                  alt={item.title}
                  className="h-full w-full object-cover pointer-events-none"
                  loading="lazy"
                  draggable={false}
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5 pointer-events-none">
                  <div className="truncate text-[11px] font-medium text-white">{item.title}</div>
                  {item.year != null || item.medium ? (
                    <div className="truncate text-[10px] text-white/80">
                      {[item.year, item.medium].filter(Boolean).join(' · ')}
                    </div>
                  ) : null}
                </div>
              </button>
            </div>
          )
        })}
      </div>

      {loading && items.length === 0 ? (
        <div className="mt-8 flex justify-center text-muted">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : null}

      {!loading && items.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-2 text-muted">
          <ImageOff className="h-8 w-8 opacity-60" />
          <p className="text-sm">
            {pick(locale, 'No artwork yet. Use + to upload.', '아직 작품이 없습니다. + 로 업로드하세요.')}
          </p>
        </div>
      ) : null}

      {!loading && items.length > 0 && filteredItems.length === 0 ? (
        <div className="mt-8 text-center text-sm text-muted">
          {pick(locale, 'No artworks match this tag.', '이 태그에 맞는 작품이 없습니다.')}
        </div>
      ) : null}

      {selectedItem ? (
        <Card className="mt-8 border-border bg-panel p-4" data-testid="artwork-detail-panel">
          <div className="flex flex-col gap-4 sm:flex-row">
            <img
              src={workspaceAssetPathToAssetUrl(selectedItem.path)}
              alt={selectedItem.title}
              className="max-h-64 w-full max-w-sm rounded-md object-contain sm:w-48"
            />
            <div className="min-w-0 flex-1 space-y-3">
              <div className="space-y-1.5">
                <label className="text-[11px] uppercase tracking-wide text-muted">
                  {pick(locale, 'Title', '제목')}
                </label>
                <Input
                  data-testid="artwork-edit-title"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder={pick(locale, 'Title', '제목')}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[11px] uppercase tracking-wide text-muted">
                    {pick(locale, 'Year', '연도')}
                  </label>
                  <Input
                    data-testid="artwork-edit-year"
                    value={editYear}
                    onChange={(e) => setEditYear(e.target.value)}
                    inputMode="numeric"
                    placeholder={pick(locale, 'e.g. 2024', '예: 2024')}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] uppercase tracking-wide text-muted">
                    {pick(locale, 'Medium', '재료/기법')}
                  </label>
                  <Input
                    data-testid="artwork-edit-medium"
                    value={editMedium}
                    onChange={(e) => setEditMedium(e.target.value)}
                    placeholder={pick(locale, 'e.g. Oil on canvas', '예: 캔버스 유화')}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] uppercase tracking-wide text-muted">
                  {pick(locale, 'Tags (in-app filter only)', '태그 (앱 필터 전용)')}
                </label>
                <Input
                  data-testid="artwork-edit-tags"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  placeholder={pick(locale, 'landscape, ink, study', '풍경, 먹, 스케치')}
                />
                <p className="text-xs text-muted">
                  {pick(
                    locale,
                    'Comma-separated. Tags filter this grid only — not published as /tags/ pages.',
                    '쉼표로 구분. 이 그리드 필터 전용이며 공개 /tags/ 페이지는 만들지 않습니다.'
                  )}
                </p>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] uppercase tracking-wide text-muted">
                  {pick(locale, 'Caption', '캡션')}
                </label>
                <textarea
                  data-testid="artwork-edit-caption"
                  value={editCaption}
                  onChange={(e) => setEditCaption(e.target.value)}
                  placeholder={pick(locale, 'Optional caption for the lightbox', '라이트박스용 캡션 (선택)')}
                  rows={3}
                  className="w-full resize-y rounded-md border border-border bg-panel2 px-3 py-2 text-sm text-ink outline-none focus:border-accent/70"
                />
              </div>
              <p className="text-xs text-muted">
                {selectedItem.path} · {formatBytes(selectedItem.size)}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  disabled={!metaDirty || savingMeta}
                  onClick={() => void handleSaveMeta()}
                >
                  {savingMeta ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  {pick(locale, 'Save details', '세부 정보 저장')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="border-danger/50 text-dangerInk hover:bg-dangerBg"
                  disabled={deleting === selectedItem.id}
                  onClick={() => void handleDelete(selectedItem)}
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  {pick(locale, 'Remove', '삭제')}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      ) : null}
    </div>
  )
}
