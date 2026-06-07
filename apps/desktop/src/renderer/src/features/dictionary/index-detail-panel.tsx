import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  FilePlus,
  FolderPlus,
  Loader2,
  Plus,
  Save,
  Trash2
} from 'lucide-react'
import type { AppLocale, IndexEntrySummary } from '@emprint/shared'
import { parentIndexPath } from '@emprint/shared'
import { pick } from '@renderer/lib/i18n'
import { Button } from '@renderer/components/ui/button'
import { Card } from '@renderer/components/ui/card'
import { Input } from '@renderer/components/ui/input'
import { useAppStore } from '@renderer/state/app-store'

function entryByPath(entries: IndexEntrySummary[], path: string): IndexEntrySummary | undefined {
  return entries.find((e) => e.path === path)
}

export function IndexDetailPanel({
  locale,
  path,
  onCreateEntry,
  onRefresh,
  onDeleted,
  onRenamed
}: {
  locale: AppLocale
  path: string | null
  onCreateEntry(indexPath: string): void
  onRefresh(): Promise<void>
  onDeleted?(): void
  onRenamed?(nextPath: string): void
}) {
  const bumpWorkspaceGitRefresh = useAppStore((state) => state.bumpWorkspaceGitRefresh)

  const [entries, setEntries] = useState<IndexEntrySummary[]>([])
  const [labelDraft, setLabelDraft] = useState('')
  const [descriptionDraft, setDescriptionDraft] = useState('')
  const [newSegment, setNewSegment] = useState('')
  const [renameSegment, setRenameSegment] = useState('')
  const [busy, setBusy] = useState<'save' | 'delete' | 'create' | 'rename' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refreshEntries = useCallback(async () => {
    const list = await window.emprint.index.list()
    setEntries(list)
  }, [])

  useEffect(() => {
    void refreshEntries()
  }, [refreshEntries, path])

  const selected = useMemo(() => (path ? entryByPath(entries, path) : undefined), [entries, path])

  useEffect(() => {
    if (!selected) {
      setLabelDraft('')
      setDescriptionDraft('')
      setRenameSegment('')
      return
    }
    setLabelDraft(selected.label ?? '')
    setDescriptionDraft(selected.description ?? '')
    const parts = selected.path.split('/')
    setRenameSegment(parts[parts.length - 1] ?? '')
  }, [selected])

  const handleSave = useCallback(async () => {
    if (!path) return
    setBusy('save')
    setError(null)
    try {
      await window.emprint.index.update({
        path,
        label: labelDraft,
        description: descriptionDraft
      })
      await refreshEntries()
      await onRefresh()
      bumpWorkspaceGitRefresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(null)
    }
  }, [bumpWorkspaceGitRefresh, descriptionDraft, labelDraft, onRefresh, path, refreshEntries])

  const handleDelete = useCallback(async () => {
    if (!path) return
    const confirmed = window.confirm(
      pick(locale, `Delete index "${path}"?`, `인덱스 "${path}"를 삭제할까요?`)
    )
    if (!confirmed) return
    setBusy('delete')
    setError(null)
    try {
      await window.emprint.index.delete({ path })
      await refreshEntries()
      await onRefresh()
      bumpWorkspaceGitRefresh()
      onDeleted?.()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(null)
    }
  }, [bumpWorkspaceGitRefresh, locale, onDeleted, onRefresh, path, refreshEntries])

  const handleCreate = useCallback(
    async (parentPath?: string) => {
      const segment = newSegment.trim()
      if (!segment) {
        setError(pick(locale, 'Enter a name for the new index.', '새 인덱스 이름을 입력하세요.'))
        return
      }
      setBusy('create')
      setError(null)
      try {
        await window.emprint.index.create({
          ...(parentPath ? { parentPath } : {}),
          segment
        })
        setNewSegment('')
        await refreshEntries()
        await onRefresh()
        bumpWorkspaceGitRefresh()
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setBusy(null)
      }
    },
    [bumpWorkspaceGitRefresh, locale, newSegment, onRefresh, refreshEntries]
  )

  const handleRename = useCallback(async () => {
    if (!path) return
    const segment = renameSegment.trim()
    if (!segment) return
    const parent = parentIndexPath(path)
    const to = parent ? `${parent}/${segment}` : segment
    if (to === path) return
    setBusy('rename')
    setError(null)
    try {
      await window.emprint.index.rename({ from: path, to })
      await refreshEntries()
      await onRefresh()
      bumpWorkspaceGitRefresh()
      onRenamed?.(to)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(null)
    }
  }, [bumpWorkspaceGitRefresh, onRefresh, onRenamed, path, refreshEntries, renameSegment])

  if (path === null) {
    return (
      <Card className="space-y-4 px-4 py-6">
        <div className="text-sm font-medium text-ink">
          {pick(locale, 'Create a top-level index', '최상위 인덱스 만들기')}
        </div>
        <p className="text-[13px] leading-relaxed text-muted">
          {pick(
            locale,
            'Pick an index in the tree or add a new topic path. Entries live under these paths.',
            '트리에서 인덱스를 선택하거나 새 주제 경로를 추가하세요. 지식 항목은 이 경로 아래에 배치됩니다.'
          )}
        </p>
        <div className="flex flex-wrap gap-2">
          <Input
            value={newSegment}
            onChange={(e) => setNewSegment(e.target.value)}
            placeholder={pick(locale, 'e.g. Getting started', '예: 시작하기')}
            className="max-w-xs text-[13px]"
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleCreate()
            }}
          />
          <Button
            type="button"
            className="h-8 gap-1.5 text-[12px]"
            disabled={busy !== null}
            onClick={() => void handleCreate()}
          >
            {busy === 'create' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <Plus className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            )}
            {pick(locale, 'Create', '만들기')}
          </Button>
        </div>
      </Card>
    )
  }

  if (!selected) {
    return (
      <Card className="px-4 py-6 text-sm text-muted">
        {pick(locale, 'Index not found. Refresh the list.', '인덱스를 찾을 수 없습니다.')}
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div
          className="flex items-start gap-2 rounded-md border border-danger/40 bg-dangerBg px-3 py-2 text-[12px] text-dangerInk"
          role="alert"
        >
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
          <div className="min-w-0 flex-1 break-words">{error}</div>
        </div>
      ) : null}

      <Card className="space-y-4 px-4 py-6">
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-muted">
            {pick(locale, 'Path', '경로')}
          </div>
          <div className="mt-1 font-mono text-[13px] text-ink">{selected.path}</div>
          <div className="mt-2 text-[12px] text-muted">
            {pick(locale, 'Direct entries', '직접 연결')}: {selected.knowledgeCount} ·{' '}
            {pick(locale, 'Including subtopics', '하위 포함')}: {selected.totalKnowledgeCount}
          </div>
        </div>

        <label className="block space-y-1">
          <span className="text-[11px] uppercase tracking-[0.16em] text-muted">
            {pick(locale, 'Label', '표시 이름')}
          </span>
          <Input value={labelDraft} onChange={(e) => setLabelDraft(e.target.value)} className="text-[13px]" />
        </label>

        <label className="block space-y-1">
          <span className="text-[11px] uppercase tracking-[0.16em] text-muted">
            {pick(locale, 'Description', '설명')}
          </span>
          <textarea
            value={descriptionDraft}
            onChange={(e) => setDescriptionDraft(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-border bg-panel px-3 py-2 text-[13px] text-ink outline-none focus:border-accent"
          />
        </label>

        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
          <Button
            type="button"
            className="h-8 gap-1.5 text-[12px]"
            disabled={busy !== null}
            onClick={() => void handleSave()}
          >
            {busy === 'save' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <Save className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            )}
            {pick(locale, 'Save', '저장')}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-8 gap-1.5 text-[12px]"
            disabled={busy !== null}
            onClick={() => onCreateEntry(selected.path)}
          >
            <FilePlus className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            {pick(locale, 'New entry here', '여기에 항목 추가')}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-8 gap-1.5 border-danger/40 text-[12px] text-dangerInk"
            disabled={busy !== null}
            onClick={() => void handleDelete()}
          >
            {busy === 'delete' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <Trash2 className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            )}
            {pick(locale, 'Delete', '삭제')}
          </Button>
        </div>

        <div className="space-y-2 border-t border-border pt-4">
          <div className="text-[11px] uppercase tracking-[0.16em] text-muted">
            {pick(locale, 'Rename path', '경로 이름 변경')}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {parentIndexPath(selected.path) ? (
              <span className="font-mono text-[12px] text-muted">{parentIndexPath(selected.path)}/</span>
            ) : null}
            <Input
              value={renameSegment}
              onChange={(e) => setRenameSegment(e.target.value)}
              className="max-w-[200px] font-mono text-[13px]"
            />
            <Button
              type="button"
              variant="outline"
              className="h-8 text-[12px]"
              disabled={busy !== null}
              onClick={() => void handleRename()}
            >
              {busy === 'rename' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                pick(locale, 'Rename', '이름 변경')
              )}
            </Button>
          </div>
        </div>

        <div className="space-y-2 border-t border-border pt-4">
          <div className="text-[11px] uppercase tracking-[0.16em] text-muted">
            {pick(locale, 'Child index', '하위 인덱스')}
          </div>
          <div className="flex flex-wrap gap-2">
            <Input
              value={newSegment}
              onChange={(e) => setNewSegment(e.target.value)}
              placeholder={pick(locale, 'Segment name', '세그먼트 이름')}
              className="max-w-xs text-[13px]"
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleCreate(selected.path)
              }}
            />
            <Button
              type="button"
              variant="outline"
              className="h-8 gap-1.5 text-[12px]"
              disabled={busy !== null}
              onClick={() => void handleCreate(selected.path)}
            >
              {busy === 'create' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <FolderPlus className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              )}
              {pick(locale, 'Add child', '하위 추가')}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
