import { useCallback, useEffect, useRef, useState } from 'react'
import { GripVertical, ImageOff, Loader2, Plus, RefreshCw, Save, Trash2 } from 'lucide-react'
import {
  MAX_FRAGMENTS_ARTWORK_COUNT,
  type AppLocale,
  type ArtworkImageInfo
} from '@emprint/shared'
import { Button } from '@renderer/components/ui/button'
import { Card } from '@renderer/components/ui/card'
import { Input } from '@renderer/components/ui/input'
import { pick } from '@renderer/lib/i18n'
import { workspaceAssetPathToAssetUrl } from '@renderer/lib/asset-paths'
import { useAppStore } from '@renderer/state/app-store'
import { cn } from '@renderer/lib/cn'

const ACCEPT = 'image/*'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export function ArtworkSurface({ locale }: { locale: AppLocale }) {
  const bumpWorkspaceGitRefresh = useAppStore((state) => state.bumpWorkspaceGitRefresh)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<ArtworkImageInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)
  const [reordering, setReordering] = useState(false)

  const [editTitle, setEditTitle] = useState('')
  const [editCaption, setEditCaption] = useState('')
  const [savingMeta, setSavingMeta] = useState(false)

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
      setItems(result)
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
      return
    }
    setEditTitle(selectedItem.title)
    setEditCaption(selectedItem.caption ?? '')
  }, [selectedItem])

  const atLimit = items.length >= MAX_FRAGMENTS_ARTWORK_COUNT
  const metaDirty =
    selectedItem != null &&
    (editTitle.trim() !== selectedItem.title ||
      editCaption.trim() !== (selectedItem.caption ?? ''))

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
      await window.emprint.artwork.update({
        id: selectedItem.id,
        title: editTitle.trim() || selectedItem.title,
        caption: editCaption.trim()
      })
      bumpWorkspaceGitRefresh()
      await load()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Save failed.')
    } finally {
      setSavingMeta(false)
    }
  }, [bumpWorkspaceGitRefresh, editCaption, editTitle, load, selectedItem])

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
              `JPEG only · up to ${MAX_FRAGMENTS_ARTWORK_COUNT} pieces · drag to reorder · published on your site shelf.`,
              `JPEG 변환 저장 · 최대 ${MAX_FRAGMENTS_ARTWORK_COUNT}점 · 드래그로 순서 변경 · 공개 사이트 선반에 표시됩니다.`
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" className="px-2 py-1.5" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {error ? (
        <Card className="mb-4 border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </Card>
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

        {items.map((item) => {
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
