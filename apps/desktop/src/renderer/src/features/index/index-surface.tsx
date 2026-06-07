import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  FolderPlus,
  Loader2,
  Plus,
  Save,
  Trash2
} from 'lucide-react'
import type { AppLocale, IndexEntrySummary, IndexTreeNode } from '@emprint/shared'
import { parentIndexPath } from '@emprint/shared'
import { pick } from '@renderer/lib/i18n'
import { Button } from '@renderer/components/ui/button'
import { Card } from '@renderer/components/ui/card'
import { Input } from '@renderer/components/ui/input'
import { cn } from '@renderer/lib/cn'
import { useAppStore } from '@renderer/state/app-store'

function entryByPath(entries: IndexEntrySummary[], path: string): IndexEntrySummary | undefined {
  return entries.find((e) => e.path === path)
}

export function IndexSurface({ locale }: { locale: AppLocale }) {
  const bumpWorkspaceGitRefresh = useAppStore((state) => state.bumpWorkspaceGitRefresh)
  const setActiveSection = useAppStore((state) => state.setActiveSection)

  const [entries, setEntries] = useState<IndexEntrySummary[]>([])
  const [tree, setTree] = useState<IndexTreeNode[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [labelDraft, setLabelDraft] = useState('')
  const [descriptionDraft, setDescriptionDraft] = useState('')
  const [newSegment, setNewSegment] = useState('')
  const [renameSegment, setRenameSegment] = useState('')
  const [busy, setBusy] = useState<'save' | 'delete' | 'create' | 'rename' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const [list, indexTree] = await Promise.all([
      window.emprint.index.list(),
      window.emprint.index.tree()
    ])
    setEntries(list)
    setTree(indexTree)
  }, [])

  useEffect(() => {
    let alive = true
    setLoading(true)
    void refresh()
      .catch((err: unknown) => {
        if (!alive) return
        setError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [refresh])

  const selected = useMemo(
    () => (selectedPath ? entryByPath(entries, selectedPath) : undefined),
    [entries, selectedPath]
  )

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

  const handleSelect = useCallback((path: string) => {
    setSelectedPath(path)
    setError(null)
    setNewSegment('')
  }, [])

  const handleSave = useCallback(async () => {
    if (!selectedPath) return
    setBusy('save')
    setError(null)
    try {
      await window.emprint.index.update({
        path: selectedPath,
        label: labelDraft,
        description: descriptionDraft
      })
      await refresh()
      bumpWorkspaceGitRefresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(null)
    }
  }, [bumpWorkspaceGitRefresh, descriptionDraft, labelDraft, refresh, selectedPath])

  const handleDelete = useCallback(async () => {
    if (!selectedPath) return
    const confirmed = window.confirm(
      pick(locale, `Delete index "${selectedPath}"?`, `인덱스 "${selectedPath}"를 삭제할까요?`)
    )
    if (!confirmed) return
    setBusy('delete')
    setError(null)
    try {
      await window.emprint.index.delete({ path: selectedPath })
      setSelectedPath(null)
      await refresh()
      bumpWorkspaceGitRefresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(null)
    }
  }, [bumpWorkspaceGitRefresh, locale, refresh, selectedPath])

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
        const created = await window.emprint.index.create({
          ...(parentPath ? { parentPath } : {}),
          segment
        })
        setNewSegment('')
        await refresh()
        setSelectedPath(created.path)
        bumpWorkspaceGitRefresh()
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setBusy(null)
      }
    },
    [bumpWorkspaceGitRefresh, locale, newSegment, refresh]
  )

  const handleRename = useCallback(async () => {
    if (!selectedPath) return
    const segment = renameSegment.trim()
    if (!segment) return
    const parent = parentIndexPath(selectedPath)
    const to = parent ? `${parent}/${segment}` : segment
    if (to === selectedPath) return
    setBusy('rename')
    setError(null)
    try {
      await window.emprint.index.rename({ from: selectedPath, to })
      setSelectedPath(to)
      await refresh()
      bumpWorkspaceGitRefresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(null)
    }
  }, [bumpWorkspaceGitRefresh, refresh, renameSegment, selectedPath])

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-8 lg:px-10">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-muted">
            {pick(locale, 'Dictionary', '사전')}
          </div>
          <h1 className="mt-1 text-xl font-semibold tracking-[-0.02em] text-ink">
            {pick(locale, 'Index', '인덱스')}
          </h1>
          <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-muted">
            {pick(
              locale,
              'Define topic paths for your knowledge base. Entries link to these paths via frontmatter.',
              '지식 항목이 연결할 주제 경로를 정의합니다. 항목 frontmatter의 index 필드와 맞춥니다.'
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-8 gap-1.5 text-[12px]"
            disabled={busy !== null}
            onClick={() => {
              setSelectedPath(null)
              setNewSegment('')
              setError(null)
            }}
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            {pick(locale, 'New top-level', '최상위 추가')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-8 text-[12px]"
            onClick={() => setActiveSection('contents')}
          >
            {pick(locale, 'Knowledge →', '지식 →')}
          </Button>
        </div>
      </div>

      {error ? (
        <div
          className="mb-4 flex items-start gap-2 rounded-md border border-danger/40 bg-dangerBg px-3 py-2 text-[12px] text-dangerInk"
          role="alert"
        >
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
          <div className="min-w-0 flex-1 break-words">{error}</div>
        </div>
      ) : null}

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <aside className="w-full shrink-0 lg:w-56">
          <div className="text-[11px] uppercase tracking-[0.16em] text-muted">
            {pick(locale, 'Tree', '트리')}
          </div>
          <nav className="mt-2 max-h-[min(70vh,520px)] overflow-auto rounded-lg border border-border bg-panel2/40 p-2">
            {loading ? (
              <div className="px-2 py-3 text-[12px] text-muted">{pick(locale, 'Loading…', '불러오는 중…')}</div>
            ) : tree.length === 0 ? (
              <div className="px-2 py-3 text-[12px] text-muted">
                {pick(locale, 'No index paths yet.', '인덱스가 없습니다.')}
              </div>
            ) : (
              <IndexManageTree nodes={tree} selected={selectedPath} onSelect={handleSelect} />
            )}
          </nav>
        </aside>

        <div className="min-w-0 flex-1 space-y-4">
          {selectedPath === null ? (
            <Card className="space-y-4 px-4 py-6">
              <div className="text-sm font-medium text-ink">
                {pick(locale, 'Create a top-level index', '최상위 인덱스 만들기')}
              </div>
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
          ) : selected ? (
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
                <Input
                  value={labelDraft}
                  onChange={(e) => setLabelDraft(e.target.value)}
                  className="text-[13px]"
                />
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
                    <span className="font-mono text-[12px] text-muted">
                      {parentIndexPath(selected.path)}/
                    </span>
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
          ) : (
            <Card className="px-4 py-6 text-sm text-muted">
              {pick(locale, 'Index not found. Refresh the list.', '인덱스를 찾을 수 없습니다.')}
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

function IndexManageTree({
  nodes,
  selected,
  onSelect,
  depth = 0
}: {
  nodes: IndexTreeNode[]
  selected: string | null
  onSelect(path: string): void
  depth?: number
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  return (
    <>
      {nodes.map((node) => {
        const isOpen = expanded[node.path] ?? depth < 2
        const hasChildren = node.children.length > 0
        const isSelected = selected === node.path
        return (
          <div key={node.path} style={{ paddingLeft: depth * 8 }}>
            <div className="flex items-center gap-0.5">
              {hasChildren ? (
                <button
                  type="button"
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted hover:text-ink"
                  aria-label={isOpen ? 'Collapse' : 'Expand'}
                  onClick={() => setExpanded((prev) => ({ ...prev, [node.path]: !isOpen }))}
                >
                  {isOpen ? (
                    <ChevronDown className="h-3 w-3" strokeWidth={2} />
                  ) : (
                    <ChevronRight className="h-3 w-3" strokeWidth={2} />
                  )}
                </button>
              ) : (
                <span className="inline-block h-6 w-6 shrink-0" aria-hidden />
              )}
              <button
                type="button"
                className={cn(
                  'min-w-0 flex-1 truncate rounded-md px-1 py-1.5 text-left text-[12px] transition',
                  isSelected ? 'bg-panel font-medium text-ink' : 'text-muted hover:bg-panel/80 hover:text-ink'
                )}
                onClick={() => onSelect(node.path)}
              >
                {node.label}
              </button>
            </div>
            {hasChildren && isOpen ? (
              <IndexManageTree
                nodes={node.children}
                selected={selected}
                onSelect={onSelect}
                depth={depth + 1}
              />
            ) : null}
          </div>
        )
      })}
    </>
  )
}
