import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  ChevronRight,
  Copy,
  GripVertical,
  Loader2,
  Plus,
  Save,
  Search,
  SquarePen,
  Trash2
} from 'lucide-react'
import { pick } from '@renderer/lib/i18n'
import type { MemoirSectionFile, MemoirSectionSummary, MemoirSectionType } from '@emprint/shared'
import {
  defaultPropsForMemoirSectionType,
  isMemoirContainerSectionType,
  isMemoirLeafSectionType,
  memoirChildLeafTypesForContainer,
  nextMemoirSectionOrder,
  parseMemoirSectionFile,
  sectionTitleFromProps
} from '@emprint/shared'
import { Button } from '@renderer/components/ui/button'
import { Card } from '@renderer/components/ui/card'
import { Input } from '@renderer/components/ui/input'
import { Badge } from '@renderer/components/ui/badge'
import { useAppStore } from '@renderer/state/app-store'
import { cn } from '@renderer/lib/cn'
import { SectionComposerForm } from './section-composer-form'
import { SectionCreateDialog } from './section-create-dialog'
import { SectionDeleteDialog } from './section-delete-dialog'
import { SectionDuplicateDialog, type SectionDuplicateMode } from './section-duplicate-dialog'
import { SectionPreviewPanel } from './section-preview-panel'
import { useMemoirComposition } from './use-memoir-composition'


async function loadAllSectionFiles(summaries: MemoirSectionSummary[]): Promise<MemoirSectionFile[]> {
  const files = await Promise.all(
    summaries.map(async (item) => {
      const doc = await window.emprint.sections.read({ path: item.path })
      return parseMemoirSectionFile(doc.content, doc.path)
    })
  )
  return files
}

function buildListRows(items: MemoirSectionSummary[]) {
  const roots = items.filter((item) => !item.parentId).sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
  const rows: Array<{ item: MemoirSectionSummary; depth: number }> = []
  for (const root of roots) {
    rows.push({ item: root, depth: 0 })
    const childIds = root.childIds ?? []
    const children = childIds
      .map((id) => items.find((i) => i.id === id))
      .filter((c): c is MemoirSectionSummary => Boolean(c))
      .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
    for (const child of children) {
      rows.push({ item: child, depth: 1 })
    }
  }
  const listed = new Set(rows.map((r) => r.item.id))
  for (const item of items) {
    if (!listed.has(item.id)) {
      rows.push({ item, depth: item.parentId ? 1 : 0 })
    }
  }
  return rows
}

export function SectionsSurface() {
  const locale = useAppStore((s) => s.locale)
  const surface = useAppStore((s) => s.surface)
  const activeDocumentPath = useAppStore((s) => s.activeDocumentPath)
  const setActiveDocumentDirty = useAppStore((s) => s.setActiveDocumentDirty)
  const openEditor = useAppStore((s) => s.openEditor)
  const openDocument = useAppStore((s) => s.openDocument)
  const backToList = useAppStore((s) => s.backToList)
  const setActiveDocumentTitle = useAppStore((s) => s.setActiveDocumentTitle)

  const [items, setItems] = useState<MemoirSectionSummary[]>([])
  const [allSections, setAllSections] = useState<MemoirSectionFile[]>([])
  const [draft, setDraft] = useState<MemoirSectionFile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [createParentId, setCreateParentId] = useState<string | undefined>()
  const [creating, setCreating] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<MemoirSectionSummary | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [duplicateTarget, setDuplicateTarget] = useState<MemoirSectionSummary | null>(null)
  const [duplicating, setDuplicating] = useState(false)
  const [showJson, setShowJson] = useState(false)
  const [showPreview, setShowPreview] = useState(true)
  const [listQuery, setListQuery] = useState('')
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)
  const [reordering, setReordering] = useState(false)
  const { composition } = useMemoirComposition()

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await window.emprint.sections.list()
      setItems(list)
      if (list.length > 0) {
        setAllSections(await loadAllSectionFiles(list))
      } else {
        setAllSections([])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load sections.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (surface === 'list' || !activeDocumentPath) {
      setDraft(null)
      return
    }
    void (async () => {
      try {
        const doc = await window.emprint.sections.read({ path: activeDocumentPath })
        const section = parseMemoirSectionFile(doc.content, doc.path)
        setDraft(section)
        setActiveDocumentDirty(false)
        const list = await window.emprint.sections.list()
        setAllSections(await loadAllSectionFiles(list))
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to open section.')
      }
    })()
  }, [activeDocumentPath, surface, setActiveDocumentDirty])

  const listRows = useMemo(() => buildListRows(items), [items])
  const filteredRows = useMemo(() => {
    const q = listQuery.trim().toLowerCase()
    if (!q) return listRows
    return listRows.filter(({ item }) => {
      const hay = `${item.title} ${item.type} ${item.id}`.toLowerCase()
      return hay.includes(q)
    })
  }, [listRows, listQuery])
  const rootItems = useMemo(() => items.filter((i) => !i.parentId).sort((a, b) => a.order - b.order), [items])

  const editorialHeroHint = useMemo(() => {
    if (!draft || composition !== 'editorial' || draft.type !== 'Hero') return false
    const roots = items.filter((i) => !i.parentId).sort((a, b) => a.order - b.order)
    const index = roots.findIndex((r) => r.id === draft.id)
    return roots[index + 1]?.type === 'Quote'
  }, [composition, draft, items])

  const handleSave = async () => {
    if (!activeDocumentPath || !draft) return
    setSaving(true)
    setError(null)
    try {
      const result = await window.emprint.sections.saveStructured({ path: activeDocumentPath, section: draft })
      setActiveDocumentDirty(false)
      if (result.path !== activeDocumentPath) {
        openDocument(result.path)
      }
      await refresh()
      const doc = await window.emprint.sections.read({ path: result.path })
      setDraft(parseMemoirSectionFile(doc.content, doc.path))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save section.')
    } finally {
      setSaving(false)
    }
  }

  const handleCreate = async ({
    id,
    type,
    parentId
  }: {
    id: string
    type: MemoirSectionType
    parentId?: string
  }) => {
    setCreating(true)
    setError(null)
    try {
      const sections = allSections.length ? allSections : await loadAllSectionFiles(items)
      const section: MemoirSectionFile = {
        id,
        type,
        order: nextMemoirSectionOrder(sections, parentId),
        published: true,
        props: defaultPropsForMemoirSectionType(type)
      }
      const result = await window.emprint.sections.create({ section, ...(parentId ? { parentId } : {}) })
      setCreateOpen(false)
      setCreateParentId(undefined)
      await refresh()
      setActiveDocumentTitle(sectionTitleFromDraft(section))
      openEditor(result.path)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create section.')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    setError(null)
    try {
      await window.emprint.sections.delete({ path: deleteTarget.path })
      setDeleteTarget(null)
      if (activeDocumentPath === deleteTarget.path) {
        backToList()
      }
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete section.')
    } finally {
      setDeleting(false)
    }
  }

  const persistRootReorder = async (sourceId: string, targetId: string) => {
    const ids = rootItems.map((r) => r.id)
    const from = ids.indexOf(sourceId)
    const to = ids.indexOf(targetId)
    if (from < 0 || to < 0 || from === to) return
    const reordered = [...ids]
    const [item] = reordered.splice(from, 1)
    if (!item) return
    reordered.splice(to, 0, item)
    setReordering(true)
    setError(null)
    try {
      await window.emprint.sections.reorderRoots({ orderedIds: reordered })
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to reorder sections.')
    } finally {
      setReordering(false)
    }
  }

  const persistChildReorder = async (parentId: string, sourceId: string, targetId: string) => {
    const parent = items.find((i) => i.id === parentId)
    const childIds = parent?.childIds ?? []
    const from = childIds.indexOf(sourceId)
    const to = childIds.indexOf(targetId)
    if (from < 0 || to < 0 || from === to) return
    const reordered = [...childIds]
    const [item] = reordered.splice(from, 1)
    if (!item) return
    reordered.splice(to, 0, item)
    setReordering(true)
    setError(null)
    try {
      await window.emprint.sections.reorderChildren({ parentId, orderedChildIds: reordered })
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to reorder child sections.')
    } finally {
      setReordering(false)
    }
  }

  const handleListDrop = async (target: MemoirSectionSummary, altKey: boolean) => {
    const sourceId = dragId
    setDragId(null)
    setDropTargetId(null)
    if (!sourceId || sourceId === target.id) return

    const source = items.find((i) => i.id === sourceId)
    if (!source) return

    // Two root sections: always reorder page order (e.g. Hero next to ProjectGroup).
    if (!source.parentId && !target.parentId) {
      await persistRootReorder(sourceId, target.id)
      return
    }

    if (source.parentId && source.parentId === target.parentId && target.parentId) {
      await persistChildReorder(target.parentId, sourceId, target.id)
      return
    }

    const allowedChildren = isMemoirContainerSectionType(target.type)
      ? memoirChildLeafTypesForContainer(target.type)
      : []
    const typeAllowed =
      isMemoirLeafSectionType(source.type) &&
      allowedChildren.includes(source.type as (typeof allowedChildren)[number])

    if (
      isMemoirContainerSectionType(target.type) &&
      typeAllowed &&
      source.parentId !== target.id &&
      (source.parentId != null || altKey)
    ) {
      setReordering(true)
      setError(null)
      try {
        await window.emprint.sections.reparent({ childId: sourceId, parentId: target.id })
        await refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to move section.')
      } finally {
        setReordering(false)
      }
      return
    }
  }

  const runDuplicate = async (item: MemoirSectionSummary, mode: SectionDuplicateMode) => {
    setDuplicating(true)
    setError(null)
    try {
      const result = await window.emprint.sections.duplicate({ path: item.path, mode })
      setDuplicateTarget(null)
      await refresh()
      setActiveDocumentTitle(item.title)
      openEditor(result.path)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to duplicate section.')
    } finally {
      setDuplicating(false)
    }
  }

  const handleDuplicateClick = (item: MemoirSectionSummary) => {
    const childCount = item.childIds?.length ?? 0
    if (isMemoirContainerSectionType(item.type) && childCount > 0) {
      setDuplicateTarget(item)
      return
    }
    void runDuplicate(item, 'shallow')
  }

  if (surface !== 'list' && activeDocumentPath && draft) {
    const title = items.find((i) => i.path === activeDocumentPath)?.title ?? draft.id
    const jsonPreview = JSON.stringify(draft, null, 2)

    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Button type="button" variant="ghost" className="h-8 px-2" onClick={backToList}>
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {pick(locale, 'Sections', '섹션')}
          </Button>
          <span className="truncate text-sm font-medium text-ink">{title}</span>
          <div className="ml-auto flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              className="h-8 px-2 text-xs text-muted lg:hidden"
              onClick={() => setShowPreview((v) => !v)}
            >
              {showPreview ? pick(locale, 'Hide preview', '미리보기 닫기') : pick(locale, 'Preview', '미리보기')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-8 px-2 text-xs text-muted"
              onClick={() => setShowJson((v) => !v)}
            >
              {showJson ? pick(locale, 'Form', '폼') : pick(locale, 'JSON', 'JSON')}
            </Button>
            <Button type="button" className="h-8" disabled={saving} onClick={() => void handleSave()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {pick(locale, 'Save', '저장')}
            </Button>
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <div className="min-h-0 flex-1 overflow-auto p-4">
            {showJson ? (
              <textarea
                className="h-full min-h-[320px] w-full resize-none rounded-md border border-border bg-panel p-3 font-mono text-[12px] leading-relaxed text-ink outline-none focus:border-accent/70"
                value={jsonPreview}
                readOnly
                spellCheck={false}
              />
            ) : (
              <SectionComposerForm
                locale={locale}
                section={draft}
                allSections={allSections}
                {...(() => {
                  const pid = items.find((i) => i.path === activeDocumentPath)?.parentId
                  return pid ? { parentId: pid } : {}
                })()}
                onChange={(next) => {
                  setDraft(next)
                  setActiveDocumentDirty(true)
                }}
              />
            )}
          </div>
          {!showJson && showPreview ? (
            <aside className="min-h-0 shrink-0 overflow-auto border-t border-border p-4 lg:w-[min(380px,38%)] lg:border-l lg:border-t-0">
              <SectionPreviewPanel
                locale={locale}
                section={draft}
                allSections={allSections}
                composition={composition}
                editorialHeroHint={editorialHeroHint}
              />
            </aside>
          ) : null}
        </div>
        {error ? <p className="px-4 pb-3 text-xs text-red-600">{error}</p> : null}
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <h1 className="text-sm font-semibold text-ink">{pick(locale, 'Sections', '섹션')}</h1>
          <p className="mt-1 text-xs text-muted">
            {pick(
              locale,
              'Compose semantic sections — themes change presentation, not structure.',
              '시맨틱 섹션을 구성합니다. 테마는 표현만 바꾸고 구조는 유지됩니다.'
            )}
          </p>
        </div>
        <Button
          type="button"
          className="h-8 shrink-0 gap-1 px-2 text-xs"
          onClick={() => {
            setCreateParentId(undefined)
            setCreateOpen(true)
          }}
        >
          <Plus className="h-3.5 w-3.5" />
          {pick(locale, 'Add', '추가')}
        </Button>
      </div>
      <div className="border-b border-border px-4 py-2">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
          <Input
            value={listQuery}
            onChange={(e) => setListQuery(e.target.value)}
            placeholder={pick(locale, 'Search sections…', '섹션 검색…')}
            className="h-8 pl-8 text-xs"
          />
        </div>
        <p className="mt-2 text-[10px] leading-relaxed text-muted">
          {pick(
            locale,
            'Drag to reorder. Hold Alt (⌥) while dropping onto a group to add as a child (only matching types, e.g. Project → Project group).',
            '드래그로 순서를 바꿉니다. 그룹에 넣으려면 Alt(⌥)를 누른 채 드롭하세요(허용된 유형만, 예: Project → Project group).'
          )}
        </p>
      </div>
      <div
        className={cn('min-h-0 flex-1 overflow-auto p-4', reordering && 'pointer-events-none opacity-70')}
      >
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            {pick(locale, 'Loading…', '불러오는 중…')}
          </div>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : filteredRows.length === 0 && items.length > 0 ? (
          <p className="text-sm text-muted">{pick(locale, 'No matching sections.', '일치하는 섹션이 없습니다.')}</p>
        ) : items.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-muted">{pick(locale, 'No sections yet.', '섹션이 없습니다.')}</p>
            <Button
              type="button"
              variant="outline"
              className="h-8 text-xs"
              onClick={() => {
                setCreateParentId(undefined)
                setCreateOpen(true)
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              {pick(locale, 'Add your first section', '첫 섹션 추가')}
            </Button>
          </div>
        ) : (
          <ul className="space-y-2">
            {filteredRows.map(({ item, depth }) => {
              const isDropTarget = dropTargetId === item.id && dragId !== item.id
              const isDragging = dragId === item.id
              return (
                <li key={item.path}>
                  <Card
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
                      void handleListDrop(item, e.altKey)
                    }}
                    className={cn(
                      'titlebar-nodrag border-border bg-panel p-3 transition hover:border-accent/40',
                      depth > 0 && 'ml-6 border-dashed',
                      activeDocumentPath === item.path && 'border-accent',
                      isDropTarget && 'border-accent ring-2 ring-dashed ring-accent/40',
                      isDragging && 'opacity-50'
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <GripVertical
                        className="mt-0.5 h-4 w-4 shrink-0 cursor-grab text-muted active:cursor-grabbing"
                        aria-hidden
                      />
                      {depth > 0 ? (
                        <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" aria-hidden />
                      ) : null}
                      <button
                        type="button"
                        className="min-w-0 flex-1 cursor-pointer text-left"
                        onClick={() => {
                          setActiveDocumentTitle(item.title)
                          openDocument(item.path)
                        }}
                      >
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-sm font-medium text-ink">{item.title}</span>
                          {!item.published ? (
                            <Badge className="h-4 px-1.5 text-[9px] uppercase tracking-wide">
                              {pick(locale, 'Hidden', '비공개')}
                            </Badge>
                          ) : null}
                        </div>
                        <div className="mt-0.5 font-mono text-[10px] text-muted">
                          {item.type} · order {item.order}
                        </div>
                      </button>
                      <div className="flex shrink-0 items-center gap-0.5">
                        {isMemoirContainerSectionType(item.type) ? (
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-8 gap-1 px-2 text-[10px]"
                            onClick={(e) => {
                              e.stopPropagation()
                              setCreateParentId(item.id)
                              setCreateOpen(true)
                            }}
                          >
                            <Plus className="h-3 w-3" />
                            {pick(locale, 'Child', '하위')}
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          aria-label={pick(locale, 'Duplicate', '복제')}
                          onClick={() => handleDuplicateClick(item)}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            setActiveDocumentTitle(item.title)
                            openEditor(item.path)
                          }}
                        >
                          <SquarePen className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-dangerInk hover:bg-dangerBg/40"
                          onClick={() => setDeleteTarget(item)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <SectionCreateDialog
        open={createOpen}
        locale={locale}
        existingIds={items.map((i) => i.id)}
        containers={items}
        {...(createParentId ? { parentId: createParentId } : {})}
        creating={creating}
        onCancel={() => {
          setCreateOpen(false)
          setCreateParentId(undefined)
        }}
        onConfirm={(input) => void handleCreate(input)}
      />
      <SectionDeleteDialog
        open={Boolean(deleteTarget)}
        locale={locale}
        title={deleteTarget?.title ?? ''}
        path={deleteTarget?.path ?? ''}
        deleting={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
      />
      <SectionDuplicateDialog
        open={duplicateTarget !== null}
        locale={locale}
        title={duplicateTarget?.title ?? ''}
        childCount={duplicateTarget?.childIds?.length ?? 0}
        duplicating={duplicating}
        onCancel={() => setDuplicateTarget(null)}
        onConfirm={(mode) => {
          if (duplicateTarget) void runDuplicate(duplicateTarget, mode)
        }}
      />
    </div>
  )
}

function sectionTitleFromDraft(section: MemoirSectionFile): string {
  return sectionTitleFromProps(section.type, section.props)
}
