import { useCallback, useMemo, useState } from 'react'
import { FolderOpen, Loader2, Upload } from 'lucide-react'
import {
  EMPRINT_MARKDOWN_FIELDS,
  type AppLocale,
  type EmprintMarkdownField,
  type MarkdownFieldMapping,
  type MarkdownMigrationFailure
} from '@emprint/shared'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { cn } from '@renderer/lib/cn'
import { useAppStore } from '@renderer/state/app-store'
import { pick } from '@renderer/lib/i18n'


const FIELD_LABELS: Record<EmprintMarkdownField, { en: string; ko: string }> = {
  title: { en: 'title', ko: 'title' },
  description: { en: 'description', ko: 'description' },
  tags: { en: 'tags', ko: 'tags' },
  draft: { en: 'draft', ko: 'draft' },
  createdAt: { en: 'createdAt', ko: 'createdAt' },
  updatedAt: { en: 'updatedAt', ko: 'updatedAt' }
}

function emptyMappings(): MarkdownFieldMapping[] {
  return EMPRINT_MARKDOWN_FIELDS.map((emprintField) => ({ emprintField, sourceKey: '' }))
}

export function MarkdownMigrationSection({ locale }: { locale: AppLocale }) {
  const bumpWorkspaceGitRefresh = useAppStore((s) => s.bumpWorkspaceGitRefresh)
  const [sourceDir, setSourceDir] = useState('')
  const [mappings, setMappings] = useState<MarkdownFieldMapping[]>(emptyMappings)
  const [scanHint, setScanHint] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [running, setRunning] = useState(false)
  const [importAsDraft, setImportAsDraft] = useState(true)
  const [skipExisting, setSkipExisting] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [resultMessage, setResultMessage] = useState<string | null>(null)

  const hasAnyMapping = useMemo(
    () => mappings.some((row) => row.sourceKey.trim().length > 0),
    [mappings]
  )

  const refreshScanHint = useCallback(
    async (dir: string) => {
      const api = window.emprint.migration?.markdown
      if (!api?.scan) return
      try {
        const result = await api.scan({ sourceDir: dir })
        if (result.fileCount === 0) {
          setScanHint(
            pick(locale, 'No .md files found in this folder.', '이 폴더에 .md 파일이 없습니다.')
          )
          return
        }
        const keys =
          result.frontmatterKeys.length > 0
            ? result.frontmatterKeys.slice(0, 12).join(', ') +
              (result.frontmatterKeys.length > 12 ? ' …' : '')
            : pick(locale, '(no YAML keys detected)', '(YAML 키 없음)')
        setScanHint(
          pick(
            locale,
            `${result.fileCount} markdown file(s). Keys found: ${keys}`,
            `마크다운 ${result.fileCount}개. 발견된 키: ${keys}`
          )
        )
      } catch {
        setScanHint(null)
      }
    },
    [locale]
  )

  const pickSourceFolder = useCallback(async () => {
    setError(null)
    setResultMessage(null)
    const selected = await window.emprint.system.selectDirectory()
    if (!selected?.directory) return
    setSourceDir(selected.directory)
    setScanning(true)
    await refreshScanHint(selected.directory)
    setScanning(false)
  }, [refreshScanHint])

  const setSourceKey = (field: EmprintMarkdownField, sourceKey: string) => {
    setMappings((prev) =>
      prev.map((row) => (row.emprintField === field ? { ...row, sourceKey } : row))
    )
  }

  const runImport = useCallback(async () => {
    const dir = sourceDir.trim()
    if (!dir) {
      setError(pick(locale, 'Choose a folder with markdown files first.', '먼저 마크다운 폴더를 선택해 주세요.'))
      return
    }
    if (!hasAnyMapping) {
      setError(
        pick(
          locale,
          'Enter at least one source YAML key to map.',
          '매핑할 원본 YAML 키를 하나 이상 입력해 주세요.'
        )
      )
      return
    }
    const api = window.emprint.migration?.markdown
    if (!api?.run) {
      setError(pick(locale, 'Migration API unavailable. Restart the app.', '마이그레이션 API를 사용할 수 없습니다.'))
      return
    }

    setRunning(true)
    setError(null)
    setResultMessage(null)
    try {
      const result = await api.run({
        sourceDir: dir,
        mappings,
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
          .map((f: MarkdownMigrationFailure) => `${f.fileName}: ${f.message}`)
          .join(' · ')
        setError(detail + (result.failures.length > 3 ? ' …' : ''))
      }
      if (result.imported > 0) {
        bumpWorkspaceGitRefresh()
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setRunning(false)
    }
  }, [hasAnyMapping, importAsDraft, locale, mappings, skipExisting, sourceDir, bumpWorkspaceGitRefresh])

  return (
    <div className="space-y-3">
      <p className="text-sm leading-relaxed text-muted">
        {pick(
          locale,
          'Import markdown files from a folder. Map your YAML frontmatter keys to Emprint fields, then copy files into this workspace.',
          '폴더 안의 마크다운을 가져옵니다. YAML frontmatter 키를 Emprint 필드에 매핑한 뒤 이 워크스페이스로 복사합니다.'
        )}
      </p>

      <div className="text-[11px] uppercase tracking-[0.16em] text-muted">
        {pick(locale, 'Source folder', '원본 폴더')}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          type="button"
          className="h-8 gap-1.5 px-2.5"
          onClick={() => void pickSourceFolder()}
        >
          {scanning ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} aria-hidden />
          ) : (
            <FolderOpen className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
          )}
          <span className="text-xs">{pick(locale, 'Choose folder', '폴더 선택')}</span>
        </Button>
      </div>
      {sourceDir ? (
        <div className="truncate font-mono text-[11px] text-muted" title={sourceDir}>
          {sourceDir}
        </div>
      ) : null}
      {scanHint ? <p className="text-xs text-muted">{scanHint}</p> : null}

      <div className="text-[11px] uppercase tracking-[0.16em] text-muted">
        {pick(locale, 'Frontmatter mapping', 'Frontmatter 매핑')}
      </div>
      <p className="text-xs text-muted">
        {pick(
          locale,
          'Your blog’s YAML key → Emprint field. Leave blank to skip a field. Unmapped keys are dropped.',
          '원본 YAML 키 → Emprint 필드. 비우면 해당 필드를 가져오지 않습니다. 매핑되지 않은 키는 제거됩니다.'
        )}
      </p>
      <div className="inline-block w-fit space-y-2 rounded-md border border-border bg-panel p-3">
        {mappings.map((row) => (
          <div key={row.emprintField} className="flex items-center gap-2">
            <Input
              className="h-8 w-36 shrink-0 font-mono text-xs"
              placeholder={pick(locale, 'e.g. date', '예: date')}
              value={row.sourceKey}
              onChange={(e) => setSourceKey(row.emprintField, e.target.value)}
              aria-label={pick(
                locale,
                `Source key for ${row.emprintField}`,
                `${row.emprintField}에 매핑할 원본 키`
              )}
            />
            <span className="shrink-0 text-xs text-muted">=</span>
            <span className="w-[7.5rem] shrink-0 font-mono text-xs text-ink">
              {FIELD_LABELS[row.emprintField][locale === 'ko' ? 'ko' : 'en']}
            </span>
          </div>
        ))}
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          className="h-3.5 w-3.5 rounded border-border accent-accent"
          checked={importAsDraft}
          onChange={(e) => setImportAsDraft(e.target.checked)}
        />
        {pick(locale, 'Import as drafts', '초안으로 가져오기')}
      </label>
      <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          className="h-3.5 w-3.5 rounded border-border accent-accent"
          checked={skipExisting}
          onChange={(e) => setSkipExisting(e.target.checked)}
        />
        {pick(locale, 'Skip files that already exist', '이미 있는 파일은 건너뛰기')}
      </label>

      <Button
        variant="primary"
        type="button"
        className="h-8 gap-1.5 px-3"
        disabled={running || !sourceDir.trim() || !hasAnyMapping}
        onClick={() => void runImport()}
      >
        {running ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} aria-hidden />
        ) : (
          <Upload className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
        )}
        <span className="text-xs">{pick(locale, 'Import', '가져오기')}</span>
      </Button>

      {resultMessage ? <p className="text-xs text-ink">{resultMessage}</p> : null}
      {error ? (
        <p className={cn('text-xs', resultMessage ? 'text-muted' : 'text-red-600 dark:text-red-400')}>{error}</p>
      ) : null}
    </div>
  )
}
