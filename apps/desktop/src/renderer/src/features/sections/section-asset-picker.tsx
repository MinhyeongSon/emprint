import { useCallback, useEffect, useRef, useState } from 'react'
import { ImageOff, Loader2, Upload } from 'lucide-react'
import type { AppLocale, AssetImageInfo } from '@emprint/shared'
import { normalizeMemoirAssetPath } from '@emprint/shared'
import { pick } from '@renderer/lib/i18n'
import { uploadWorkspaceAssetFiles } from '@renderer/lib/asset-upload'
import { workspaceAssetPathToAssetUrl } from '@renderer/lib/asset-paths'
import { Button } from '@renderer/components/ui/button'
import { useAppStore } from '@renderer/state/app-store'
import { cn } from '@renderer/lib/cn'

export function SectionAssetPicker({
  locale,
  value,
  onChange,
  label
}: {
  locale: AppLocale
  value: string
  onChange: (path: string) => void
  label: string
}) {
  const bumpWorkspaceGitRefresh = useAppStore((state) => state.bumpWorkspaceGitRefresh)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [images, setImages] = useState<AssetImageInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  const load = useCallback(async () => {
    if (!window.emprint?.assets?.listImages) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const list = await window.emprint.assets.listImages()
      setImages(list)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const handleUploadFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList?.length) return
      setUploading(true)
      setUploadError(null)
      setOpen(true)
      try {
        const { saved, errors } = await uploadWorkspaceAssetFiles(Array.from(fileList))
        if (errors.length > 0) {
          setUploadError(errors.join(' '))
        }
        if (saved.length > 0) {
          bumpWorkspaceGitRefresh()
          await load()
          const first = saved[0]
          if (first) onChange(first.path)
        }
      } finally {
        setUploading(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    },
    [bumpWorkspaceGitRefresh, load, onChange]
  )

  const normalized = value.trim() ? normalizeMemoirAssetPath(value) : ''
  const previewSrc = normalized ? workspaceAssetPathToAssetUrl(normalized) : ''

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
        multiple
        className="sr-only"
        onChange={(e) => void handleUploadFiles(e.target.files)}
      />

      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-ink">{label}</span>
        {normalized ? (
          <Button type="button" variant="ghost" className="h-7 px-2 text-[11px] text-muted" onClick={() => onChange('')}>
            {pick(locale, 'Clear', '지우기')}
          </Button>
        ) : null}
      </div>

      {normalized ? (
        <div className="flex items-start gap-3 rounded-md border border-border bg-panel2/50 p-2">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md border border-border bg-panel">
            <img src={previewSrc} alt="" className="h-full w-full object-cover" />
          </div>
          <p className="min-w-0 flex-1 break-all font-mono text-[10px] text-muted">{normalized}</p>
        </div>
      ) : (
        <div className="flex h-16 items-center justify-center rounded-md border border-dashed border-border bg-panel2/30 text-muted">
          <ImageOff className="h-5 w-5" strokeWidth={1.5} aria-hidden />
        </div>
      )}

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-8 flex-1 gap-1.5 text-xs"
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
        <Button type="button" variant="outline" className="h-8 flex-1 text-xs" onClick={() => setOpen((v) => !v)}>
          {open
            ? pick(locale, 'Hide library', '라이브러리 닫기')
            : pick(locale, 'Choose from Assets', 'Assets에서 선택')}
        </Button>
      </div>

      {uploadError ? <p className="text-xs text-dangerInk">{uploadError}</p> : null}

      {open ? (
        <div className="max-h-48 overflow-auto rounded-md border border-border bg-panel p-2">
          {loading ? (
            <div className="flex justify-center py-6 text-muted">
              <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} aria-hidden />
            </div>
          ) : images.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted">
              {pick(
                locale,
                'No images yet. Use Upload image above.',
                '아직 이미지가 없습니다. 위에서 이미지를 업로드하세요.'
              )}
            </p>
          ) : (
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {images.map((img) => {
                const selected = normalized === img.path
                return (
                  <li key={img.path}>
                    <button
                      type="button"
                      className={cn(
                        'block w-full overflow-hidden rounded-md border transition',
                        selected ? 'border-accent ring-2 ring-accent/40' : 'border-border hover:border-accent/50'
                      )}
                      onClick={() => {
                        onChange(img.path)
                        setOpen(false)
                      }}
                    >
                      <img
                        src={workspaceAssetPathToAssetUrl(img.path)}
                        alt={img.name}
                        className="aspect-square w-full object-cover"
                      />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  )
}
