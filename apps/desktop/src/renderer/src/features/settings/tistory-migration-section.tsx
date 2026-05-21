import { useCallback, useState } from 'react'
import { useAppStore } from '@renderer/state/app-store'
import { FolderOpen, Loader2, Upload } from 'lucide-react'
import { pick } from '@renderer/lib/i18n'
import type { AppLocale, TistoryMigrationPostPreview } from '@emprint/shared'
import { Button } from '@renderer/components/ui/button'
import { cn } from '@renderer/lib/cn'


export function TistoryMigrationSection({ locale }: { locale: AppLocale }) {
  const bumpHubCatalogRefresh = useAppStore((s) => s.bumpHubCatalogRefresh)
  const [backupDir, setBackupDir] = useState('')
  const [scanning, setScanning] = useState(false)
  const [running, setRunning] = useState(false)
  const [previews, setPreviews] = useState<TistoryMigrationPostPreview[] | null>(null)
  const [importAsDraft, setImportAsDraft] = useState(true)
  const [skipExisting, setSkipExisting] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [resultMessage, setResultMessage] = useState<string | null>(null)

  const pickBackupFolder = useCallback(async () => {
    setError(null)
    setResultMessage(null)
    const selected = await window.emprint.system.selectDirectory()
    if (!selected?.directory) return
    setBackupDir(selected.directory)
    setPreviews(null)
  }, [])

  const scanBackup = useCallback(async () => {
    const dir = backupDir.trim()
    if (!dir) {
      setError(pick(locale, 'Choose a Tistory backup folder first.', '먼저 티스토리 백업 폴더를 선택해 주세요.'))
      return
    }
    const api = window.emprint.migration?.tistory
    if (!api?.scan) {
      setError(pick(locale, 'Migration API unavailable. Restart the app.', '마이그레이션 API를 사용할 수 없습니다.'))
      return
    }

    setScanning(true)
    setError(null)
    setResultMessage(null)
    try {
      const result = await api.scan({ backupDir: dir })
      setPreviews(result.posts)
      if (result.posts.length === 0) {
        setError(
          pick(
            locale,
            'No Tistory posts found. Each post should be in a numbered folder with an HTML file.',
            '티스토리 글이 없습니다. 글마다 번호 폴더와 HTML 파일이 있어야 합니다.'
          )
        )
      }
    } catch (caught) {
      setPreviews(null)
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setScanning(false)
    }
  }, [backupDir, locale])

  const runMigration = useCallback(async () => {
    const dir = backupDir.trim()
    if (!dir) {
      setError(pick(locale, 'Choose a Tistory backup folder first.', '먼저 티스토리 백업 폴더를 선택해 주세요.'))
      return
    }
    const api = window.emprint.migration?.tistory
    if (!api?.run) {
      setError(pick(locale, 'Migration API unavailable. Restart the app.', '마이그레이션 API를 사용할 수 없습니다.'))
      return
    }

    setRunning(true)
    setError(null)
    setResultMessage(null)
    try {
      const result = await api.run({
        backupDir: dir,
        importAsDraft,
        skipExisting
      })
      setResultMessage(
        pick(
          locale,
          `Imported ${result.imported}, skipped ${result.skipped}, failed ${result.failed}.`,
          `가져옴 ${result.imported}건, 건너뜀 ${result.skipped}건, 실패 ${result.failed}건.`
        )
      )
      if (result.failures.length > 0) {
        const detail = result.failures
          .slice(0, 3)
          .map((f) => `${f.title}: ${f.message}`)
          .join(' · ')
        setError(detail + (result.failures.length > 3 ? ' …' : ''))
      }
      if (result.imported > 0) {
        bumpHubCatalogRefresh()
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setRunning(false)
    }
  }, [backupDir, importAsDraft, locale, skipExisting, bumpHubCatalogRefresh])

  return (
    <div className="space-y-3">
      <p className="text-sm leading-relaxed text-muted">
        {pick(
          locale,
          'Import posts from a Tistory HTML backup (code blocks, quotes, lists, tables, dividers, link cards, images). Local images copy to assets/images/.',
          '티스토리 HTML 백업을 가져옵니다(코드 블록, 인용, 목록, 표, 구분선, 링크 카드, 이미지). 로컬 이미지는 assets/images/로 복사됩니다.'
        )}
      </p>

      <div className="text-[11px] uppercase tracking-[0.16em] text-muted">
        {pick(locale, 'Backup folder', '백업 폴더')}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          type="button"
          className="h-8 gap-1.5 px-2.5"
          onClick={() => void pickBackupFolder()}
        >
          <FolderOpen className="h-4 w-4" strokeWidth={2} />
          <span className="text-xs">{pick(locale, 'Choose folder', '폴더 선택')}</span>
        </Button>
        <Button
          variant="outline"
          type="button"
          className="h-8 px-2.5"
          disabled={scanning || !backupDir.trim()}
          onClick={() => void scanBackup()}
        >
          {scanning ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} aria-hidden />
          ) : (
            <span className="text-xs">{pick(locale, 'Scan', '검색')}</span>
          )}
        </Button>
      </div>
      {backupDir ? (
        <div className="truncate font-mono text-[11px] text-muted" title={backupDir}>
          {backupDir}
        </div>
      ) : null}

      {previews && previews.length > 0 ? (
        <p className="text-xs text-muted">
          {pick(locale, `${previews.length} posts ready to import.`, `가져올 글 ${previews.length}건`)}
        </p>
      ) : null}

      <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          className="h-3.5 w-3.5 rounded border-border"
          checked={importAsDraft}
          onChange={(e) => setImportAsDraft(e.target.checked)}
        />
        {pick(locale, 'Import as drafts', '초안으로 가져오기')}
      </label>
      <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          className="h-3.5 w-3.5 rounded border-border"
          checked={skipExisting}
          onChange={(e) => setSkipExisting(e.target.checked)}
        />
        {pick(locale, 'Skip files that already exist', '이미 있는 파일은 건너뛰기')}
      </label>

      <Button
        variant="primary"
        type="button"
        className="h-8 gap-1.5 px-3"
        disabled={running || !backupDir.trim()}
        onClick={() => void runMigration()}
      >
        {running ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} aria-hidden />
        ) : (
          <Upload className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
        )}
        <span className="text-xs">{pick(locale, 'Run migration', '마이그레이션 실행')}</span>
      </Button>

      {resultMessage ? <p className="text-xs text-ink">{resultMessage}</p> : null}
      {error ? (
        <p className={cn('text-xs', resultMessage ? 'text-muted' : 'text-red-600 dark:text-red-400')}>{error}</p>
      ) : null}
    </div>
  )
}
