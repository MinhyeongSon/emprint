import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, FileText, Folder } from 'lucide-react'
import type { AppLocale, IndexTreeNode, KnowledgeSummary } from '@emprint/shared'
import { isIndexPrefix, normalizeIndexPath } from '@emprint/shared'
import { pick } from '@renderer/lib/i18n'
import { cn } from '@renderer/lib/cn'
import { matchesKnowledgeSearch } from '@renderer/features/knowledge/knowledge-markdown'

export type ContentsTreeSelection =
  | { kind: 'index'; path: string }
  | { kind: 'document'; path: string }
  | null

export type ContentsDragPayload =
  | { kind: 'index'; path: string }
  | { kind: 'document'; path: string }

const DRAG_MIME = 'application/x-emprint-contents'

const UNINDEXED_KEY = '__unindexed__'

function documentsForIndex(items: KnowledgeSummary[], indexPath: string): KnowledgeSummary[] {
  const normalized = normalizeIndexPath(indexPath)
  return items
    .filter((item) => normalizeIndexPath(item.index ?? '') === normalized)
    .sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }))
}

function unindexedDocuments(items: KnowledgeSummary[]): KnowledgeSummary[] {
  return items
    .filter((item) => !normalizeIndexPath(item.index ?? ''))
    .sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }))
}

function documentMatchesFilter(
  doc: KnowledgeSummary,
  query: string,
  matchingDocPaths: Set<string> | null
): boolean {
  if (matchingDocPaths) return matchingDocPaths.has(doc.path)
  return matchesKnowledgeSearch(doc, query)
}

function indexNodeMatchesSearch(
  node: IndexTreeNode,
  query: string,
  items: KnowledgeSummary[],
  matchingDocPaths: Set<string> | null
): boolean {
  if (!query.trim() && !matchingDocPaths) return true
  const docs = documentsForIndex(items, node.path)
  if (
    !matchingDocPaths &&
    (node.label.toLowerCase().includes(query.toLowerCase()) ||
      node.path.toLowerCase().includes(query.toLowerCase()))
  ) {
    return true
  }
  if (docs.some((doc) => documentMatchesFilter(doc, query, matchingDocPaths))) return true
  return node.children.some((child) => indexNodeMatchesSearch(child, query, items, matchingDocPaths))
}

function parseDragPayload(data: DataTransfer): ContentsDragPayload | null {
  const raw = data.getData(DRAG_MIME)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as ContentsDragPayload
    if (parsed.kind === 'index' && typeof parsed.path === 'string') return parsed
    if (parsed.kind === 'document' && typeof parsed.path === 'string') return parsed
    return null
  } catch {
    return null
  }
}

function canDropIndexOnParent(from: string, toParentPath: string): boolean {
  const parent = normalizeIndexPath(toParentPath)
  if (!parent) return true
  if (from === parent) return false
  if (isIndexPrefix(from, parent)) return false
  return true
}

export function ContentsTree({
  locale,
  indexTree,
  knowledgeItems,
  selection,
  searchQuery,
  matchingDocPaths = null,
  onSelectIndex,
  onSelectDocument,
  onReparentIndex,
  onReassignDocument
}: {
  locale: AppLocale
  indexTree: IndexTreeNode[]
  knowledgeItems: KnowledgeSummary[]
  selection: ContentsTreeSelection
  searchQuery: string
  matchingDocPaths?: Set<string> | null
  onSelectIndex(path: string): void
  onSelectDocument(path: string): void
  onReparentIndex?(from: string, toParentPath: string): void | Promise<void>
  onReassignDocument?(path: string, indexPath: string): void | Promise<void>
}) {
  const [dropTarget, setDropTarget] = useState<string | null>(null)
  const unindexed = useMemo(() => unindexedDocuments(knowledgeItems), [knowledgeItems])
  const filteredUnindexed = useMemo(
    () => unindexed.filter((item) => documentMatchesFilter(item, searchQuery, matchingDocPaths)),
    [matchingDocPaths, searchQuery, unindexed]
  )

  const visibleTree = useMemo(
    () =>
      indexTree.filter((node) => indexNodeMatchesSearch(node, searchQuery, knowledgeItems, matchingDocPaths)),
    [indexTree, knowledgeItems, matchingDocPaths, searchQuery]
  )

  const handleDropOnIndex = (targetPath: string, e: React.DragEvent) => {
    e.preventDefault()
    setDropTarget(null)
    const payload = parseDragPayload(e.dataTransfer)
    if (!payload) return
    if (payload.kind === 'document') {
      void onReassignDocument?.(payload.path, targetPath)
      return
    }
    if (payload.kind === 'index' && payload.path !== targetPath && canDropIndexOnParent(payload.path, targetPath)) {
      void onReparentIndex?.(payload.path, targetPath)
    }
  }

  const handleDropOnRoot = (e: React.DragEvent) => {
    e.preventDefault()
    setDropTarget(null)
    const payload = parseDragPayload(e.dataTransfer)
    if (!payload) return
    if (payload.kind === 'document') {
      void onReassignDocument?.(payload.path, '')
      return
    }
    if (payload.kind === 'index' && payload.path.includes('/')) {
      void onReparentIndex?.(payload.path, '')
    }
  }

  return (
    <nav
      className="space-y-0.5 p-2"
      onDragOver={(e) => {
        if (parseDragPayload(e.dataTransfer)) e.preventDefault()
      }}
      onDrop={handleDropOnRoot}
    >
      {visibleTree.length === 0 && filteredUnindexed.length === 0 ? (
        <div className="px-2 py-3 text-[12px] text-muted">
          {pick(locale, 'No topics or entries yet.', '주제나 항목이 없습니다.')}
        </div>
      ) : (
        <>
          {visibleTree.map((node) => (
            <IndexBranch
              key={node.path}
              locale={locale}
              node={node}
              depth={0}
              knowledgeItems={knowledgeItems}
              selection={selection}
              searchQuery={searchQuery}
              matchingDocPaths={matchingDocPaths}
              dropTarget={dropTarget}
              onSelectIndex={onSelectIndex}
              onSelectDocument={onSelectDocument}
              onDragStartIndex={(path) => {
                /* handled in row */
              }}
              onDropOnIndex={handleDropOnIndex}
              onDragEnterIndex={(path) => setDropTarget(path)}
              onDragLeaveIndex={() => setDropTarget(null)}
            />
          ))}
          {filteredUnindexed.length > 0 || (!searchQuery.trim() && unindexed.length > 0) ? (
            <UnindexedBranch
              locale={locale}
              documents={filteredUnindexed.length > 0 ? filteredUnindexed : unindexed}
              selection={selection}
              onSelectDocument={onSelectDocument}
              onDragStartDocument={(path, e) => {
                e.dataTransfer.setData(DRAG_MIME, JSON.stringify({ kind: 'document', path }))
                e.dataTransfer.effectAllowed = 'move'
              }}
            />
          ) : null}
        </>
      )}
    </nav>
  )
}

function IndexBranch({
  locale,
  node,
  depth,
  knowledgeItems,
  selection,
  searchQuery,
  matchingDocPaths,
  dropTarget,
  onSelectIndex,
  onSelectDocument,
  onDropOnIndex,
  onDragEnterIndex,
  onDragLeaveIndex
}: {
  locale: AppLocale
  node: IndexTreeNode
  depth: number
  knowledgeItems: KnowledgeSummary[]
  selection: ContentsTreeSelection
  searchQuery: string
  matchingDocPaths: Set<string> | null
  dropTarget: string | null
  onSelectIndex(path: string): void
  onSelectDocument(path: string): void
  onDragStartIndex(path: string): void
  onDropOnIndex(targetPath: string, e: React.DragEvent): void
  onDragEnterIndex(path: string): void
  onDragLeaveIndex(): void
}) {
  const [expanded, setExpanded] = useState(depth < 2)
  const docs = useMemo(() => {
    const direct = documentsForIndex(knowledgeItems, node.path)
    return searchQuery.trim() || matchingDocPaths
      ? direct.filter((item) => documentMatchesFilter(item, searchQuery, matchingDocPaths))
      : direct
  }, [knowledgeItems, matchingDocPaths, node.path, searchQuery])

  const visibleChildren = useMemo(
    () =>
      node.children.filter((child) =>
        indexNodeMatchesSearch(child, searchQuery, knowledgeItems, matchingDocPaths)
      ),
    [matchingDocPaths, node.children, knowledgeItems, searchQuery]
  )

  const hasChildren = visibleChildren.length > 0 || docs.length > 0
  const isIndexSelected = selection?.kind === 'index' && selection.path === node.path
  const isOpen = expanded || Boolean(searchQuery.trim()) || Boolean(matchingDocPaths?.size)
  const isDropTarget = dropTarget === node.path

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-0.5 rounded-md transition',
          isDropTarget && 'bg-accent/10 ring-1 ring-accent/40'
        )}
        style={{ paddingLeft: depth * 8 }}
        onDragOver={(e) => {
          if (parseDragPayload(e.dataTransfer)) {
            e.preventDefault()
            e.stopPropagation()
          }
        }}
        onDragEnter={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onDragEnterIndex(node.path)
        }}
        onDragLeave={(e) => {
          e.stopPropagation()
          onDragLeaveIndex()
        }}
        onDrop={(e) => {
          e.stopPropagation()
          onDropOnIndex(node.path, e)
        }}
      >
        {hasChildren ? (
          <button
            type="button"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted hover:text-ink"
            aria-label={isOpen ? 'Collapse' : 'Expand'}
            onClick={() => setExpanded((prev) => !prev)}
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
          draggable
          className={cn(
            'flex min-w-0 flex-1 items-center gap-1.5 truncate rounded-md px-1 py-1.5 text-left text-[12px] transition',
            isIndexSelected ? 'bg-panel font-medium text-ink' : 'text-muted hover:bg-panel/80 hover:text-ink'
          )}
          onClick={() => onSelectIndex(node.path)}
          onDragStart={(e) => {
            e.dataTransfer.setData(DRAG_MIME, JSON.stringify({ kind: 'index', path: node.path }))
            e.dataTransfer.effectAllowed = 'move'
          }}
        >
          <Folder className="h-3 w-3 shrink-0 opacity-70" strokeWidth={2} aria-hidden />
          <span className="truncate">{node.label}</span>
        </button>
      </div>

      {isOpen ? (
        <>
          {docs.map((doc) => (
            <DocumentRow
              key={doc.path}
              doc={doc}
              depth={depth + 1}
              selected={selection?.kind === 'document' && selection.path === doc.path}
              onSelect={() => onSelectDocument(doc.path)}
            />
          ))}
          {visibleChildren.map((child) => (
            <IndexBranch
              key={child.path}
              locale={locale}
              node={child}
              depth={depth + 1}
              knowledgeItems={knowledgeItems}
              selection={selection}
              searchQuery={searchQuery}
              matchingDocPaths={matchingDocPaths}
              dropTarget={dropTarget}
              onSelectIndex={onSelectIndex}
              onSelectDocument={onSelectDocument}
              onDragStartIndex={() => {}}
              onDropOnIndex={onDropOnIndex}
              onDragEnterIndex={onDragEnterIndex}
              onDragLeaveIndex={onDragLeaveIndex}
            />
          ))}
        </>
      ) : null}
    </div>
  )
}

function UnindexedBranch({
  locale,
  documents,
  selection,
  onSelectDocument,
  onDragStartDocument
}: {
  locale: AppLocale
  documents: KnowledgeSummary[]
  selection: ContentsTreeSelection
  onSelectDocument(path: string): void
  onDragStartDocument(path: string, e: React.DragEvent): void
}) {
  const [expanded, setExpanded] = useState(true)
  const isOpen = expanded

  return (
    <div className="mt-2 border-t border-border pt-2">
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted hover:text-ink"
          aria-label={isOpen ? 'Collapse' : 'Expand'}
          onClick={() => setExpanded((prev) => !prev)}
        >
          {isOpen ? (
            <ChevronDown className="h-3 w-3" strokeWidth={2} />
          ) : (
            <ChevronRight className="h-3 w-3" strokeWidth={2} />
          )}
        </button>
        <div className="px-1 py-1.5 text-[11px] uppercase tracking-[0.12em] text-muted">
          {pick(locale, 'Unindexed', '인덱스 없음')}
        </div>
      </div>
      {isOpen
        ? documents.map((doc) => (
            <DocumentRow
              key={doc.path}
              doc={doc}
              depth={1}
              selected={selection?.kind === 'document' && selection.path === doc.path}
              draggable
              onDragStart={(e) => onDragStartDocument(doc.path, e)}
              onSelect={() => onSelectDocument(doc.path)}
            />
          ))
        : null}
    </div>
  )
}

function DocumentRow({
  doc,
  depth,
  selected,
  draggable = true,
  onDragStart,
  onSelect
}: {
  doc: KnowledgeSummary
  depth: number
  selected: boolean
  draggable?: boolean
  onDragStart?(e: React.DragEvent): void
  onSelect(): void
}) {
  return (
    <div style={{ paddingLeft: depth * 8 + 4 }}>
      <button
        type="button"
        draggable={draggable}
        className={cn(
          'flex w-full min-w-0 items-center gap-1.5 truncate rounded-md px-1 py-1.5 text-left text-[12px] transition',
          selected ? 'bg-panel font-medium text-ink' : 'text-muted hover:bg-panel/80 hover:text-ink'
        )}
        onClick={onSelect}
        onDragStart={(e) => {
          e.dataTransfer.setData(DRAG_MIME, JSON.stringify({ kind: 'document', path: doc.path }))
          e.dataTransfer.effectAllowed = 'move'
          onDragStart?.(e)
        }}
      >
        <FileText className="h-3 w-3 shrink-0 opacity-70" strokeWidth={2} aria-hidden />
        <span className="truncate">{doc.title}</span>
      </button>
    </div>
  )
}

export { UNINDEXED_KEY }
