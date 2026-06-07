import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ImageOff, Loader2, RefreshCw, Trash2, Upload } from 'lucide-react'
import { pick } from '@renderer/lib/i18n'
import type { AppLocale, AssetImageInfo, AssetPublishScope, AssetReference } from '@emprint/shared'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import { Card } from '@renderer/components/ui/card'
import { Tooltip } from '@renderer/components/ui/tooltip'
import { uploadWorkspaceAssetFiles } from '@renderer/lib/asset-upload'
import { workspaceAssetPathToAssetUrl } from '@renderer/lib/asset-paths'
import { useAppStore } from '@renderer/state/app-store'
import { cn } from '@renderer/lib/cn'
import { AssetDeleteDialog } from './asset-delete-dialog'


function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function formatDate(value: string): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toISOString().slice(0, 10)
}

function publishScopeLabel(scope: AssetPublishScope, locale: AppLocale): string {
  switch (scope) {
    case 'published':
      return pick(locale, 'Included in publish', '발행 포함')
    case 'draft-only':
      return pick(locale, 'Draft only', '드래프트 전용')
    default:
      return pick(locale, 'Unused', '미사용')
  }
}

export function AssetsSurface({ locale }: { locale: AppLocale }) {
  const bumpWorkspaceGitRefresh = useAppStore((state) => state.bumpWorkspaceGitRefresh)
  const setActiveSection = useAppStore((state) => state.setActiveSection)
  const openEditor = useAppStore((state) => state.openEditor)
  const siteProjectKind =
    useAppStore((state) => state.workspaceConfig?.siteProjectKind) ??
    useAppStore((state) => state.workspaceResult?.manifest.siteProjectKind) ??
    'column'

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [images, setImages] = useState<AssetImageInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  // Image currently queued for deletion via the confirmation dialog. Holding the
  // full info (not just the path) keeps the dialog body stable while we mutate
  // `images` in the background.
  const [pendingDelete, setPendingDelete] = useState<AssetImageInfo | null>(null)

  const load = useCallback(async () => {
    if (!window.emprint?.assets?.listImages) {
      setError(pick(locale, 'Asset API unavailable.', '에셋 API를 사용할 수 없습니다.'))
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const result = await window.emprint.assets.listImages()
      setImages(result)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to load assets.')
    } finally {
      setLoading(false)
    }
  }, [locale])

  useEffect(() => {
    void load()
  }, [load])

  const totalSize = useMemo(() => images.reduce((sum, img) => sum + img.size, 0), [images])
  const orphanCount = useMemo(() => images.filter((img) => img.publishScope === 'orphan').length, [images])
  const draftOnlyCount = useMemo(
    () => images.filter((img) => img.publishScope === 'draft-only').length,
    [images]
  )
  const publishCount = useMemo(
    () => images.filter((img) => img.publishScope === 'published').length,
    [images]
  )

  const selectedImage = useMemo(
    () => images.find((img) => img.path === selected) ?? null,
    [images, selected]
  )

  const requestDelete = useCallback((image: AssetImageInfo) => {
    setPendingDelete(image)
  }, [])

  const cancelDelete = useCallback(() => {
    setPendingDelete(null)
  }, [])

  const handleUploadFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList?.length) return
      setUploading(true)
      setError(null)
      try {
        const { saved, errors } = await uploadWorkspaceAssetFiles(Array.from(fileList))
        if (errors.length > 0) {
          setError(errors.join(' '))
        }
        if (saved.length > 0) {
          bumpWorkspaceGitRefresh()
          setSelected(saved[saved.length - 1]!.path)
        }
        await load()
      } finally {
        setUploading(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    },
    [bumpWorkspaceGitRefresh, load]
  )

  const confirmDelete = useCallback(async () => {
    const image = pendingDelete
    if (!image) return
    setDeleting(image.path)
    try {
      await window.emprint.assets.deleteImage({ path: image.path })
      bumpWorkspaceGitRefresh()
      if (selected === image.path) setSelected(null)
      setPendingDelete(null)
      await load()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Delete failed.')
    } finally {
      setDeleting(null)
    }
  }, [bumpWorkspaceGitRefresh, load, pendingDelete, selected])

  const handleOpenReference = useCallback(
    (ref: AssetReference) => {
      // Close any open delete dialog so the navigation isn't hidden behind it.
      setPendingDelete(null)
      const section =
        ref.section === 'knowledge'
          ? 'contents'
          : ref.section === 'story'
            ? 'story'
            : ref.section
      setActiveSection(section)
      openEditor(ref.postPath)
    },
    [openEditor, setActiveSection]
  )

  const emptyHint =
    siteProjectKind === 'memoir'
      ? pick(
          locale,
          'No images yet. Upload here or from a section image field in Sections.',
          '아직 이미지가 없습니다. 여기서 업로드하거나 Sections의 이미지 필드에서 추가하세요.'
        )
      : pick(
          locale,
          'No images yet. Upload here or drag an image into a post or draft.',
          '아직 이미지가 없습니다. 여기서 업로드하거나 글·드래프트에 이미지를 드래그하세요.'
        )

  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 py-8 lg:px-10">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
        multiple
        className="sr-only"
        onChange={(e) => void handleUploadFiles(e.target.files)}
      />
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-muted">Assets</div>
          <div className="mt-2 text-[22px] font-semibold tracking-[-0.03em] text-ink">
            {pick(locale, 'Media library', '미디어 라이브러리')}
          </div>
          <div className="mt-1 text-xs text-muted">
            {pick(
              locale,
              `${images.length} image${images.length === 1 ? '' : 's'} · ${formatBytes(totalSize)} · ${publishCount} publish · ${draftOnlyCount} draft-only${
                orphanCount ? ` · ${orphanCount} unused` : ''
              }`,
              `이미지 ${images.length}개 · ${formatBytes(totalSize)} · 발행 ${publishCount} · 드래프트 전용 ${draftOnlyCount}${
                orphanCount ? ` · 미사용 ${orphanCount}` : ''
              }`
            )}
          </div>
          <div className="mt-1.5 text-[11px] leading-relaxed text-muted">
            {pick(
              locale,
              'Only images referenced by published posts are included when you publish. Draft-only and unused images stay on this computer.',
              '발행할 때는 발행된 글(Posts)에서 참조하는 이미지만 사이트에 올라갑니다. 드래프트 전용·미사용 이미지는 이 컴퓨터에만 남습니다.'
            )}
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            variant="outline"
            type="button"
            className="h-8 gap-1.5 px-3 text-xs"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} aria-hidden />
            ) : (
              <Upload className="h-4 w-4" strokeWidth={2} aria-hidden />
            )}
            {pick(locale, 'Upload', '업로드')}
          </Button>
          <Button
            variant="outline"
            type="button"
            className="h-8 w-8 shrink-0 p-0"
            aria-label={pick(locale, 'Refresh', '새로고침')}
            title={pick(locale, 'Refresh', '새로고침')}
            onClick={() => void load()}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} aria-hidden />
            ) : (
              <RefreshCw className="h-4 w-4" strokeWidth={2} />
            )}
          </Button>
        </div>
      </div>

      {error ? (
        <Card className="mb-4 border-danger/40 bg-dangerBg px-4 py-3 text-sm text-dangerInk">{error}</Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div>
          {loading ? (
            <Card className="px-4 py-12 text-center text-sm text-muted">
              {pick(locale, 'Loading…', '불러오는 중…')}
            </Card>
          ) : images.length === 0 ? (
            <Card className="flex flex-col items-center gap-3 px-4 py-14 text-center text-sm text-muted">
              <ImageOff className="h-5 w-5" strokeWidth={2} aria-hidden />
              <div>{emptyHint}</div>
              <Button
                type="button"
                variant="outline"
                className="h-8 gap-1.5 text-xs"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} aria-hidden />
                ) : (
                  <Upload className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                )}
                {pick(locale, 'Upload image', '이미지 업로드')}
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
              {images.map((image) => {
                const isActive = selected === image.path
                const referenceCount = image.references.length
                const scope = image.publishScope
                return (
                  <div
                    key={image.path}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isActive}
                    onClick={() => setSelected(image.path)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        setSelected(image.path)
                      }
                    }}
                    className={cn(
                      'group relative flex cursor-pointer flex-col overflow-hidden rounded-md border bg-surface text-left transition',
                      isActive ? 'border-accent/60' : 'border-border hover:border-accent/30',
                      'focus:outline-none focus:ring-1 focus:ring-accent/40'
                    )}
                  >
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-panel2">
                      <img
                        src={workspaceAssetPathToAssetUrl(image.path)}
                        alt={image.name}
                        className="h-full w-full object-cover transition-opacity group-hover:opacity-95"
                        draggable={false}
                        loading="lazy"
                      />
                      <span
                        className={cn(
                          'absolute left-1.5 top-1.5 rounded-sm border px-1.5 py-0.5 text-[10px] uppercase tracking-wide backdrop-blur-sm',
                          scope === 'published'
                            ? 'border-accent/50 bg-accent/15 text-ink'
                            : scope === 'draft-only'
                              ? 'border-border/60 bg-panel/85 text-muted'
                              : 'border-border/60 bg-panel/85 text-muted'
                        )}
                      >
                        {publishScopeLabel(scope, locale)}
                      </span>
                      {referenceCount > 0 ? (
                        <span
                          className="absolute right-1.5 top-1.5 rounded-sm border border-border/60 bg-panel/85 px-1.5 py-0.5 text-[10px] tracking-wide text-ink backdrop-blur-sm"
                          title={pick(
                            locale,
                            `Used by ${referenceCount} post${referenceCount === 1 ? '' : 's'}`,
                            `${referenceCount}개의 글에서 사용 중`
                          )}
                        >
                          {referenceCount} {pick(locale, 'in use', '사용 중')}
                        </span>
                      ) : null}
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          requestDelete(image)
                        }}
                        disabled={deleting === image.path}
                        aria-label={pick(locale, `Delete ${image.name}`, `${image.name} 삭제`)}
                        title={
                          referenceCount > 0
                            ? pick(
                                locale,
                                `Delete (used by ${referenceCount} post${referenceCount === 1 ? '' : 's'})`,
                                `삭제 (${referenceCount}개 글에서 사용 중)`
                              )
                            : pick(locale, 'Delete', '삭제')
                        }
                        className={cn(
                          'absolute bottom-1.5 right-1.5 inline-flex h-7 w-7 items-center justify-center rounded-sm border bg-panel/90 text-muted opacity-0 shadow-panel backdrop-blur-sm transition focus:opacity-100 focus:outline-none focus:ring-1 focus:ring-accent/40 group-hover:opacity-100',
                          referenceCount > 0
                            ? 'border-danger/40 hover:border-danger hover:text-dangerInk'
                            : 'border-border/70 hover:border-accent/40 hover:text-ink'
                        )}
                      >
                        {deleting === image.path ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} aria-hidden />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                        )}
                      </button>
                    </div>
                    <div className="min-w-0 px-2 py-1.5">
                      <div className="truncate font-mono text-[11px] text-ink">{image.name}</div>
                      <div className="mt-0.5 flex items-center justify-between text-[10px] text-muted">
                        <span>{formatBytes(image.size)}</span>
                        <span>
                          {referenceCount}{' '}
                          {pick(locale, 'ref', '참조')}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <aside className="hidden min-h-0 lg:block">
          {selectedImage ? (
            <Card className="space-y-3 px-4 py-4">
              <div className="overflow-hidden rounded-md border border-border bg-panel2">
                <img
                  src={workspaceAssetPathToAssetUrl(selectedImage.path)}
                  alt={selectedImage.name}
                  className="block max-h-[260px] w-full object-contain"
                  draggable={false}
                />
              </div>
              <div className="space-y-1">
                <div className="truncate font-mono text-[12px] text-ink">{selectedImage.name}</div>
                <div className="font-mono text-[10px] text-muted">{selectedImage.path}</div>
                <div className="pt-1">
                  <Badge
                    className={cn(
                      selectedImage.publishScope === 'published' && 'border-accent/40 bg-accent/10'
                    )}
                  >
                    {publishScopeLabel(selectedImage.publishScope, locale)}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2 pt-1 text-[11px] text-muted">
                  <span>{formatBytes(selectedImage.size)}</span>
                  <span>·</span>
                  <span>{formatDate(selectedImage.modifiedAt)}</span>
                  <span>·</span>
                  <span>{selectedImage.mimeType}</span>
                </div>
              </div>

              <div>
                <div className="mb-1.5 text-[11px] uppercase tracking-[0.16em] text-muted">
                  {pick(locale, 'Referenced in', '참조하는 글')}
                </div>
                {selectedImage.references.length === 0 ? (
                  <div className="rounded-md border border-dashed border-border/70 bg-panel/40 px-3 py-3 text-xs text-muted">
                    {pick(
                      locale,
                      'Not referenced by any post. It will not be published until a published post uses it.',
                      '어떤 글에서도 참조하지 않습니다. 발행된 글에서 쓰기 전까지 사이트에 올라가지 않습니다.'
                    )}
                  </div>
                ) : selectedImage.publishScope === 'draft-only' ? (
                  <div className="rounded-md border border-border/70 bg-panel/40 px-3 py-3 text-xs text-muted">
                    {pick(
                      locale,
                      'Only drafts reference this image. Publish those posts (or move them to Posts) to include it on the live site.',
                      '드래프트에서만 참조 중입니다. 해당 글을 발행하거나 Posts로 옮기면 사이트에 포함됩니다.'
                    )}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {selectedImage.references.map((ref) => (
                      <button
                        key={`${ref.section}:${ref.postPath}`}
                        type="button"
                        onClick={() => handleOpenReference(ref)}
                        className="flex w-full items-center justify-between gap-2 rounded-md border border-border bg-panel px-2.5 py-1.5 text-left text-xs text-ink transition hover:border-accent/40 hover:bg-panel2/60"
                      >
                        <span className="truncate">{ref.postTitle}</span>
                        <Badge>{ref.section === 'posts' ? pick(locale, 'Posts', '글') : pick(locale, 'Drafts', '드래프트')}</Badge>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-1">
                <Tooltip label={pick(locale, 'Delete image', '이미지 삭제')}>
                  <Button
                    variant="outline"
                    type="button"
                    className={cn(
                      'h-8 gap-1.5 px-2.5 text-xs',
                      selectedImage.references.length > 0 &&
                        'border-danger/50 text-dangerInk hover:border-danger hover:bg-dangerBg/40'
                    )}
                    onClick={() => requestDelete(selectedImage)}
                    disabled={deleting === selectedImage.path}
                  >
                    {deleting === selectedImage.path ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} aria-hidden />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                    )}
                    {pick(locale, 'Delete', '삭제')}
                  </Button>
                </Tooltip>
              </div>
            </Card>
          ) : (
            <Card className="px-4 py-8 text-center text-xs text-muted">
              {pick(locale, 'Select an image to see references and details.', '이미지를 선택하면 참조 정보와 상세를 볼 수 있습니다.')}
            </Card>
          )}
        </aside>
      </div>

      <AssetDeleteDialog
        open={pendingDelete !== null}
        locale={locale}
        image={pendingDelete}
        deleting={deleting !== null && pendingDelete !== null && deleting === pendingDelete.path}
        onCancel={cancelDelete}
        onConfirm={() => void confirmDelete()}
        onOpenReference={handleOpenReference}
      />
    </div>
  )
}
