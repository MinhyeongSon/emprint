import { useCallback, useEffect, useMemo, useState } from 'react'
import { FilePlus, Loader2, Plus, Search } from 'lucide-react'
import type { AppLocale, IndexTreeNode, KnowledgeSearchHit, KnowledgeSummary } from '@emprint/shared'
import { allocateDatedMarkdownPath } from '@emprint/shared'
import { pick } from '@renderer/lib/i18n'
import { DeploySearchHint } from '@renderer/components/deploy-search-hint'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { useAppStore } from '@renderer/state/app-store'
import { KnowledgeSurface } from '@renderer/features/knowledge/knowledge-surface'
import { buildNewKnowledgeTemplate } from '@renderer/features/knowledge/knowledge-markdown'
import { ContentsTree, type ContentsTreeSelection } from './contents-tree'
import { IndexDetailPanel } from './index-detail-panel'

export function ContentsSurface({ locale }: { locale: AppLocale }) {
  const surface = useAppStore((state) => state.surface)
  const activeDocumentPath = useAppStore((state) => state.activeDocumentPath)
  const openDocument = useAppStore((state) => state.openDocument)
  const openEditor = useAppStore((state) => state.openEditor)
  const backToList = useAppStore((state) => state.backToList)
  const bumpWorkspaceGitRefresh = useAppStore((state) => state.bumpWorkspaceGitRefresh)

  const [indexTree, setIndexTree] = useState<IndexTreeNode[]>([])
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchHits, setSearchHits] = useState<KnowledgeSearchHit[] | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [selectedIndexPath, setSelectedIndexPath] = useState<string | null>(null)

  const useDeepSearch = searchQuery.trim().length >= 2

  const refresh = useCallback(async () => {
    const snapshot = await window.emprint.dictionary.contentsSnapshot()
    setIndexTree(snapshot.indexTree)
    setKnowledgeItems(snapshot.knowledge)
  }, [])

  const handleReparentIndex = useCallback(
    async (from: string, toParentPath: string) => {
      await window.emprint.dictionary.reparentIndex({ from, toParentPath })
      await refresh()
      bumpWorkspaceGitRefresh()
      if (selectedIndexPath === from) {
        const leaf = from.split('/').pop() ?? from
        const parent = toParentPath.trim()
        setSelectedIndexPath(parent ? `${parent}/${leaf}` : leaf)
      }
    },
    [bumpWorkspaceGitRefresh, refresh, selectedIndexPath]
  )

  const handleReassignDocument = useCallback(
    async (path: string, indexPath: string) => {
      await window.emprint.dictionary.reassignEntryIndex({ path, index: indexPath })
      await refresh()
      bumpWorkspaceGitRefresh()
    },
    [bumpWorkspaceGitRefresh, refresh]
  )

  useEffect(() => {
    let alive = true
    setLoading(true)
    void refresh()
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [refresh])

  useEffect(() => {
    const query = searchQuery.trim()
    if (query.length < 2) {
      setSearchHits(null)
      setSearchLoading(false)
      return
    }

    let alive = true
    setSearchLoading(true)
    const timer = window.setTimeout(() => {
      void window.emprint.knowledge
        .search({ section: 'knowledge', query })
        .then((hits) => {
          if (!alive) return
          setSearchHits(hits)
          setSearchLoading(false)
        })
        .catch(() => {
          if (!alive) return
          setSearchHits([])
          setSearchLoading(false)
        })
    }, 300)

    return () => {
      alive = false
      window.clearTimeout(timer)
    }
  }, [searchQuery, knowledgeItems])

  const matchingDocPaths = useMemo(() => {
    if (!useDeepSearch || !searchHits) return null
    return new Set(searchHits.map((hit) => hit.path))
  }, [searchHits, useDeepSearch])

  const treeSelection = useMemo((): ContentsTreeSelection => {
    if (surface !== 'list' && activeDocumentPath) {
      return { kind: 'document', path: activeDocumentPath }
    }
    if (selectedIndexPath) {
      return { kind: 'index', path: selectedIndexPath }
    }
    return null
  }, [activeDocumentPath, selectedIndexPath, surface])

  const handleSelectIndex = useCallback(
    (path: string) => {
      backToList()
      setSelectedIndexPath(path)
    },
    [backToList]
  )

  const handleSelectDocument = useCallback(
    (path: string) => {
      setSelectedIndexPath(null)
      openDocument(path)
    },
    [openDocument]
  )

  const handleDocumentBack = useCallback(() => {
    backToList()
  }, [backToList])

  const createEntry = useCallback(
    async (indexPath?: string) => {
      setCreating(true)
      try {
        const path = allocateDatedMarkdownPath(
          'knowledge',
          knowledgeItems.map((item) => item.path)
        )
        const template = buildNewKnowledgeTemplate({
          ...(indexPath ? { index: indexPath } : {}),
          draft: false
        })
        await window.emprint.knowledge.save({ path, content: template })
        await refresh()
        bumpWorkspaceGitRefresh()
        setSelectedIndexPath(indexPath ?? null)
        openEditor(path)
      } finally {
        setCreating(false)
      }
    },
    [bumpWorkspaceGitRefresh, knowledgeItems, openEditor, refresh]
  )

  const showDocumentPane = surface !== 'list' && Boolean(activeDocumentPath)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-border px-4 py-4 lg:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.16em] text-muted">
              {pick(locale, 'Dictionary', '사전')}
            </div>
            <h1 className="mt-1 text-xl font-semibold tracking-[-0.02em] text-ink">
              {pick(locale, 'Contents', '목차')}
            </h1>
            <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-muted">
              {pick(
                locale,
                'Topic tree and knowledge entries in one place. Select a path or entry to edit.',
                '주제 트리와 지식 항목을 한 화면에서 편집합니다. 경로나 항목을 선택하세요.'
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-8 gap-1.5 text-[12px]"
              disabled={creating}
              onClick={() => {
                setSelectedIndexPath(null)
                backToList()
              }}
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              {pick(locale, 'New top-level index', '최상위 인덱스')}
            </Button>
            <Button
              type="button"
              className="h-8 gap-1.5 text-[12px]"
              disabled={creating}
              onClick={() => void createEntry(selectedIndexPath ?? undefined)}
            >
              {creating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <FilePlus className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              )}
              {pick(locale, 'New entry', '새 항목')}
            </Button>
          </div>
        </div>

        <div className="relative mt-4 max-w-md">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            strokeWidth={2}
            aria-hidden
          />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={pick(
              locale,
              'Search topics, entries, and body text…',
              '주제·항목·본문 검색…'
            )}
            className="h-9 pl-9 text-[13px]"
          />
        </div>
        {searchLoading && useDeepSearch ? (
          <p className="mt-2 text-[11px] text-muted">{pick(locale, 'Searching…', '검색 중…')}</p>
        ) : null}
        <DeploySearchHint locale={locale} context="authoring" className="mt-3 max-w-xl" />
      </div>

      <div className="flex min-h-0 flex-1">
        <aside className="w-full shrink-0 overflow-auto border-r border-border bg-panel2/20 lg:w-64 xl:w-72">
          {loading ? (
            <div className="px-4 py-6 text-[12px] text-muted">{pick(locale, 'Loading…', '불러오는 중…')}</div>
          ) : (
            <ContentsTree
              locale={locale}
              indexTree={indexTree}
              knowledgeItems={knowledgeItems}
              selection={treeSelection}
              searchQuery={searchQuery}
              matchingDocPaths={matchingDocPaths}
              onSelectIndex={handleSelectIndex}
              onSelectDocument={handleSelectDocument}
              onReparentIndex={handleReparentIndex}
              onReassignDocument={handleReassignDocument}
            />
          )}
        </aside>

        <div className="min-h-0 min-w-0 flex-1 overflow-auto px-4 py-6 lg:px-8">
          {showDocumentPane ? (
            <KnowledgeSurface
              locale={locale}
              section="knowledge"
              variant="embedded"
              onDocumentBack={handleDocumentBack}
              onKnowledgeMutated={refresh}
            />
          ) : (
            <IndexDetailPanel
              locale={locale}
              path={selectedIndexPath}
              onCreateEntry={(indexPath) => void createEntry(indexPath)}
              onRefresh={refresh}
              onDeleted={() => setSelectedIndexPath(null)}
              onRenamed={(nextPath) => setSelectedIndexPath(nextPath)}
            />
          )}
        </div>
      </div>
    </div>
  )
}
