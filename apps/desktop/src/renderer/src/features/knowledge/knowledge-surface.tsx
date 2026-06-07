import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  FileDown,
  FilePlus,
  ListChecks,
  Loader2,
  Save,
  Search,
  Send,
  SquarePen,
  Trash2,
  X
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { pick } from '@renderer/lib/i18n'
import type { AppLocale, IndexTreeNode, KnowledgeSearchHit, KnowledgeSummary } from '@emprint/shared'
import { allocateDatedMarkdownPath, isIndexPrefix, normalizeIndexPath } from '@emprint/shared'
import {
  buildKnowledgeMarkdown,
  buildNewKnowledgeTemplate,
  formatKnowledgeDate,
  inferTitleFromPath,
  knowledgeFrontmatterFromEditor,
  matchesKnowledgeSearch,
  normalizeTagArray,
  parseKnowledge,
  parseTagsDraft,
  rebuildTagDraft,
  snippetFromMarkdown,
  splitCommittedTagsAndTail
} from './knowledge-markdown'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import { Card } from '@renderer/components/ui/card'
import { Input } from '@renderer/components/ui/input'
import { Tooltip } from '@renderer/components/ui/tooltip'
import { TipTapEditor, type InsertedImage } from '@renderer/components/editor/tiptap-editor'
import { useAppStore } from '@renderer/state/app-store'
import { cn } from '@renderer/lib/cn'
import { PostDeleteDialog } from '../posts/post-delete-dialog'
import {
  compressImage,
  isSupportedImageMime,
  MAX_ASSET_IMAGE_BYTES
} from '@renderer/lib/image-compress'
import {
  rewriteAssetUrlsForDisk,
  rewriteAssetUrlsForEditor,
  workspaceAssetPathToAssetUrl
} from '@renderer/lib/asset-paths'

type Section = 'knowledge' | 'drafts'

function flattenIndexPaths(nodes: IndexTreeNode[]): string[] {
  const out: string[] = []
  const walk = (list: IndexTreeNode[]) => {
    for (const node of list) {
      out.push(node.path)
      walk(node.children)
    }
  }
  walk(nodes)
  return out
}

type PendingDelete =
  | { kind: 'single'; path: string; title: string }
  | { kind: 'bulk'; paths: string[] }

async function moveKnowledgeBetweenSections(
  path: string,
  targetSection: 'knowledge' | 'drafts'
): Promise<string> {
  const result = await window.emprint.knowledge.read({ path })
  const parsed = parseKnowledge(result.content)
  const fileName = path.split('/').pop()
  if (!fileName) {
    throw new Error('Unable to determine the target filename.')
  }
  const targetPath = `${targetSection}/${fileName}`
  if (path === targetPath) {
    return path
  }
  const nextData: Record<string, unknown> = {
    ...parsed.data,
    draft: targetSection === 'drafts'
  }
  const nextMarkdown = buildKnowledgeMarkdown({ data: nextData, body: parsed.body })
  await window.emprint.knowledge.save({ path, content: nextMarkdown })
  const moved = await window.emprint.knowledge.move({ from: path, to: targetPath })
  return moved.path
}

export function KnowledgeSurface({
  locale,
  section,
  variant = 'standalone',
  onDocumentBack,
  onKnowledgeMutated
}: {
  locale: AppLocale
  section: Section
  variant?: 'standalone' | 'embedded'
  onDocumentBack?: () => void
  onKnowledgeMutated?: () => void | Promise<void>
}) {
  const isEmbedded = variant === 'embedded'
  const surface = useAppStore((state) => state.surface)
  const openDocument = useAppStore((state) => state.openDocument)
  const openEditor = useAppStore((state) => state.openEditor)
  const backToList = useAppStore((state) => state.backToList)
  const handleDocumentBack = onDocumentBack ?? backToList

  const notifyMutated = useCallback(async () => {
    if (onKnowledgeMutated) {
      await onKnowledgeMutated()
    }
  }, [onKnowledgeMutated])
  const setActiveSection = useAppStore((state) => state.setActiveSection)
  const activeDocumentPath = useAppStore((state) => state.activeDocumentPath)
  const setActiveDocumentTitle = useAppStore((state) => state.setActiveDocumentTitle)
  const setActiveDocumentDirty = useAppStore((state) => state.setActiveDocumentDirty)
  const bumpWorkspaceGitRefresh = useAppStore((state) => state.bumpWorkspaceGitRefresh)

  // The single source of truth for publish state is the folder a file lives in.
  // `knowledge/` → published, `drafts/` → draft. The frontmatter `draft` flag is kept
  // consistent with the folder so downstream static-site builds (Astro etc.) work.
  const isDraftSection = section === 'drafts'

  const [items, setItems] = useState<KnowledgeSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [activeContent, setActiveContent] = useState<string>('')
  const [editorBody, setEditorBody] = useState<string>('')
  const [editorTitle, setEditorTitle] = useState<string>('')
  const [editorTags, setEditorTags] = useState<string[]>([])
  const [tagDraft, setTagDraft] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [moving, setMoving] = useState(false)
  const [transitionKey, setTransitionKey] = useState(0)
  const [imageNotice, setImageNotice] = useState<
    | { kind: 'uploading'; count: number; current?: string }
    | { kind: 'error'; message: string }
    | { kind: 'success'; message: string }
    | null
  >(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [loadedSnapshot, setLoadedSnapshot] = useState<{
    title: string
    tags: string[]
    index: string
    body: string
  } | null>(null)
  // Post (or draft) queued for deletion via the confirmation dialog. We keep
  // the displayed title separately so the dialog stays stable even after the
  // list is refetched following a successful delete.
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null)
  const [deletingPath, setDeletingPath] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchHits, setSearchHits] = useState<KnowledgeSearchHit[] | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [indexFilter, setIndexFilter] = useState<string | null>(null)
  const [indexTree, setIndexTree] = useState<IndexTreeNode[]>([])
  const [editorIndex, setEditorIndex] = useState('')
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(() => new Set())
  const [bulkBusy, setBulkBusy] = useState<'delete' | 'move' | null>(null)
  const tagTailInputRef = useRef<HTMLInputElement | null>(null)
  const tagDraftRef = useRef(tagDraft)
  tagDraftRef.current = tagDraft

  const { committed: committedTagParts, tail: tagTail } = useMemo(() => splitCommittedTagsAndTail(tagDraft), [tagDraft])

  const applyTagDraft = useCallback((next: string) => {
    tagDraftRef.current = next
    setTagDraft(next)
    setEditorTags(parseTagsDraft(next))
  }, [])

  const handleTagTailChange = useCallback(
    (rawTail: string) => {
      const prev = tagDraftRef.current
      const { committed } = splitCommittedTagsAndTail(prev)
      let nextDraft: string
      if (rawTail.includes(',')) {
        const pieces = rawTail.split(',')
        const newSegments = pieces
          .slice(0, -1)
          .map((p) => p.trim())
          .filter(Boolean)
        const rest = pieces[pieces.length - 1] ?? ''
        const merged = normalizeTagArray([...committed, ...newSegments])
        nextDraft = rebuildTagDraft(merged, rest)
      } else {
        nextDraft = rebuildTagDraft(committed, rawTail)
      }
      applyTagDraft(nextDraft)
    },
    [applyTagDraft]
  )

  const handleTagTailKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== 'Backspace') return
      if (tagTail !== '') return
      e.preventDefault()
      const prev = tagDraftRef.current
      const { committed } = splitCommittedTagsAndTail(prev)
      if (committed.length === 0) return
      const next = committed.slice(0, -1)
      const nextDraft = next.length === 0 ? '' : `${next.join(', ')}, `
      applyTagDraft(nextDraft)
    },
    [applyTagDraft, tagTail]
  )

  const handleTagFieldBlur = useCallback(() => {
    const normalized = parseTagsDraft(tagDraftRef.current)
    applyTagDraft(normalized.join(', '))
  }, [applyTagDraft])

  useEffect(() => {
    let alive = true
    setLoading(true)
    void window.emprint.knowledge
      .list({ section })
      .then((result) => {
        if (!alive) return
        setItems(result)
      })
      .finally(() => {
        if (!alive) return
        setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [section])

  useEffect(() => {
    setSearchQuery('')
    setSearchHits(null)
    setIndexFilter(null)
    setSelectionMode(false)
    setSelectedPaths(new Set())
  }, [section])

  const useDeepSearch = searchQuery.trim().length >= 2

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
        .search({ section, query })
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
  }, [searchQuery, section, items])

  useEffect(() => {
    let alive = true
    void window.emprint.index.tree().then((tree) => {
      if (!alive) return
      setIndexTree(tree)
    })
    return () => {
      alive = false
    }
  }, [items, section])

  const filteredItems = useMemo(() => {
    const pool = useDeepSearch
      ? (searchHits ?? []).map((hit) => {
          const summary = items.find((item) => item.path === hit.path)
          return {
            item:
              summary ??
              ({
                path: hit.path,
                title: hit.title,
                description: hit.description,
                index: hit.index,
                tags: hit.tags,
                draft: isDraftSection,
                createdAt: '',
                updatedAt: hit.updatedAt
              } satisfies KnowledgeSummary),
            snippet: hit.snippet
          }
        })
      : items.map((item) => ({ item, snippet: undefined as string | undefined }))

    return pool.filter(({ item }) => {
      if (indexFilter === '__none__') {
        if (normalizeIndexPath(item.index ?? '')) return false
      } else if (indexFilter && !isIndexPrefix(indexFilter, item.index ?? '')) {
        return false
      }
      if (useDeepSearch) return true
      return matchesKnowledgeSearch(item, searchQuery)
    })
  }, [indexFilter, isDraftSection, items, searchHits, searchQuery, useDeepSearch])

  const [registryPaths, setRegistryPaths] = useState<string[]>([])

  useEffect(() => {
    let alive = true
    void window.emprint.index.list().then((list) => {
      if (!alive) return
      setRegistryPaths(list.map((e) => e.path))
    })
    return () => {
      alive = false
    }
  }, [items, section])

  const indexSuggestions = useMemo(() => {
    const merged = new Set([...flattenIndexPaths(indexTree), ...registryPaths])
    return [...merged].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
  }, [indexTree, registryPaths])

  const selectedCount = selectedPaths.size
  const allFilteredSelected =
    filteredItems.length > 0 && filteredItems.every(({ item }) => selectedPaths.has(item.path))

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false)
    setSelectedPaths(new Set())
  }, [])

  const toggleSelectedPath = useCallback((path: string) => {
    setSelectedPaths((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }, [])

  const toggleSelectAllFiltered = useCallback(() => {
    setSelectedPaths((prev) => {
      const next = new Set(prev)
      if (allFilteredSelected) {
        for (const { item } of filteredItems) {
          next.delete(item.path)
        }
      } else {
        for (const { item } of filteredItems) {
          next.add(item.path)
        }
      }
      return next
    })
  }, [allFilteredSelected, filteredItems])

  useEffect(() => {
    if (!activeDocumentPath || surface === 'list') {
      setActiveContent('')
      setEditorBody('')
      setEditorTitle('')
      setEditorTags([])
      setTagDraft('')
      setLoadedSnapshot(null)
      setActiveDocumentTitle(undefined)
      setActiveDocumentDirty(false)
      return
    }

    let alive = true
    void window.emprint.knowledge.read({ path: activeDocumentPath }).then((result) => {
      if (!alive) return
      setActiveContent(result.content)
      const parsed = parseKnowledge(result.content)
      // Rewrite root-relative `/assets/...` references so the in-editor preview can
      // resolve them via the `emprint-asset://` protocol.
      const bodyForEditor = rewriteAssetUrlsForEditor(parsed.body)
      setEditorBody(bodyForEditor)
      const existingTitle = typeof parsed.data.title === 'string' ? parsed.data.title : ''
      const fallbackTitle = inferTitleFromPath(activeDocumentPath)
      const nextTitle = existingTitle || fallbackTitle
      setEditorTitle(nextTitle)
      const tagsFromMatter = Array.isArray(parsed.data.tags) ? parsed.data.tags.map(String) : []
      const tags = tagsFromMatter.length ? tagsFromMatter : (activeSummary?.tags ?? [])
      const nextTags = normalizeTagArray(tags)
      setEditorTags(nextTags)
      setTagDraft(nextTags.join(', '))
      const indexRaw = typeof parsed.data.index === 'string' ? parsed.data.index : ''
      const nextIndex = normalizeIndexPath(indexRaw || (activeSummary?.index ?? ''))
      setEditorIndex(nextIndex)
      setLoadedSnapshot({
        title: nextTitle,
        tags: nextTags,
        index: nextIndex,
        body: bodyForEditor
      })
      setActiveDocumentTitle(nextTitle)
      setActiveDocumentDirty(false)
    })

    return () => {
      alive = false
    }
  }, [activeDocumentPath, surface])

  useEffect(() => {
    if (!activeDocumentPath || !loadedSnapshot) return
    // Compare using the same normalization we persist on save; otherwise a
    // trailing space in the title keeps `dirty` true forever and the sidebar
    // Publish guard (`activeDocumentDirty`) fights the user right after Save.
    const titleNorm = editorTitle.trim() || inferTitleFromPath(activeDocumentPath)
    const tagsNorm = normalizeTagArray(editorTags)
    const indexNorm = normalizeIndexPath(editorIndex)
    const dirty =
      loadedSnapshot.title !== titleNorm ||
      loadedSnapshot.body !== editorBody ||
      loadedSnapshot.tags.join('|') !== tagsNorm.join('|') ||
      loadedSnapshot.index !== indexNorm
    setActiveDocumentTitle(titleNorm)
    setActiveDocumentDirty(dirty)
  }, [
    activeDocumentPath,
    loadedSnapshot,
    editorTitle,
    editorBody,
    editorTags,
    editorIndex,
    setActiveDocumentTitle,
    setActiveDocumentDirty
  ])

  const activeSummary = useMemo(
    () => items.find((item) => item.path === activeDocumentPath),
    [items, activeDocumentPath]
  )

  // Promote a draft to a post (or send a post back to drafts) by saving the
  // current edits with the correct frontmatter and then renaming the file
  // across the folder boundary. The folder is the single source of truth.
  const handleMoveSection = useCallback(async () => {
    if (!activeDocumentPath) return
    setMoving(true)
    setSaveError(null)
    try {
      const targetSection: 'knowledge' | 'drafts' = isDraftSection ? 'knowledge' : 'drafts'
      const fileName = activeDocumentPath.split('/').pop()
      if (!fileName) {
        throw new Error('Unable to determine the target filename.')
      }
      const targetPath = `${targetSection}/${fileName}`

      const existing = parseKnowledge(activeContent)
      const nextData = knowledgeFrontmatterFromEditor({
        existing: existing.data,
        title: editorTitle,
        tags: editorTags,
        index: editorIndex,
        draft: targetSection === 'drafts'
      })
      const bodyForDisk = rewriteAssetUrlsForDisk(editorBody)
      const nextMarkdown = buildKnowledgeMarkdown({ data: nextData, body: bodyForDisk })

      await window.emprint.knowledge.save({
        path: activeDocumentPath,
        content: nextMarkdown
      })
      const moved = await window.emprint.knowledge.move({
        from: activeDocumentPath,
        to: targetPath
      })

      setActiveContent(nextMarkdown)
      setLoadedSnapshot({
        title: editorTitle.trim() || inferTitleFromPath(moved.path),
        tags: normalizeTagArray(editorTags),
        index: normalizeIndexPath(editorIndex),
        body: editorBody
      })
      setActiveDocumentDirty(false)
      bumpWorkspaceGitRefresh()
      await notifyMutated()
      setActiveSection(targetSection === 'knowledge' ? 'contents' : 'drafts')
      openEditor(moved.path)
    } catch (caught) {
      const message =
        caught instanceof Error
          ? caught.message
          : typeof caught === 'string'
            ? caught
            : 'Unknown error'
      setSaveError(message)
    } finally {
      setMoving(false)
    }
  }, [
    activeContent,
    activeDocumentPath,
    editorBody,
    editorTags,
    editorTitle,
    bumpWorkspaceGitRefresh,
    notifyMutated,
    isDraftSection,
    openEditor,
    setActiveDocumentDirty,
    setActiveSection
  ])

  const requestDelete = useCallback(
    (input: { path: string; title?: string }) => {
      // Don't let the user delete with unsaved edits — their in-memory work
      // would silently vanish. Surface an inline error and bail.
      if (input.path === activeDocumentPath) {
        const dirty = useAppStore.getState().activeDocumentDirty
        if (dirty) {
          setSaveError(
            pick(
              locale,
              'Save or discard your unsaved changes before deleting this post.',
              '삭제하기 전에 저장하지 않은 변경사항을 먼저 저장하거나 취소해 주세요.'
            )
          )
          return
        }
      }
      setPendingDelete({
        kind: 'single',
        path: input.path,
        title: input.title || inferTitleFromPath(input.path)
      })
    },
    [activeDocumentPath, locale]
  )

  const requestBulkDelete = useCallback(() => {
    const paths = [...selectedPaths]
    if (paths.length === 0) return
    if (paths.includes(activeDocumentPath ?? '') && useAppStore.getState().activeDocumentDirty) {
      setSaveError(
        pick(
          locale,
          'Save or discard your unsaved changes before deleting the open post.',
          '삭제하기 전에 열린 글의 저장하지 않은 변경사항을 먼저 저장하거나 취소해 주세요.'
        )
      )
      return
    }
    setPendingDelete({ kind: 'bulk', paths })
  }, [activeDocumentPath, locale, selectedPaths])

  const confirmDelete = useCallback(async () => {
    const target = pendingDelete
    if (!target) return
    const paths = target.kind === 'single' ? [target.path] : target.paths
    if (target.kind === 'single') {
      setDeletingPath(target.path)
    } else {
      setBulkBusy('delete')
    }
    setSaveError(null)
    try {
      for (const path of paths) {
        await window.emprint.knowledge.delete({ path })
      }
      setPendingDelete(null)

      if (activeDocumentPath && paths.includes(activeDocumentPath)) {
        setActiveContent('')
        setEditorBody('')
        setEditorTitle('')
        setEditorTags([])
        setTagDraft('')
        setLoadedSnapshot(null)
        setActiveDocumentTitle(undefined)
        setActiveDocumentDirty(false)
        handleDocumentBack()
      }

      const refreshed = await window.emprint.knowledge.list({ section })
      if (refreshed) setItems(refreshed)
      bumpWorkspaceGitRefresh()
      await notifyMutated()
      exitSelectionMode()
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught)
      setSaveError(message)
      console.error('[emprint] post delete failed', caught)
    } finally {
      setDeletingPath(null)
      setBulkBusy(null)
    }
  }, [
    activeDocumentPath,
    backToList,
    handleDocumentBack,
    notifyMutated,
    pendingDelete,
    section,
    bumpWorkspaceGitRefresh,
    exitSelectionMode,
    setActiveDocumentDirty,
    setActiveDocumentTitle
  ])

  const handleBulkMoveSection = useCallback(async () => {
    const paths = [...selectedPaths]
    if (paths.length === 0) return
    if (paths.includes(activeDocumentPath ?? '') && useAppStore.getState().activeDocumentDirty) {
      setSaveError(
        pick(
          locale,
          'Save or discard your unsaved changes before moving the open post.',
          '이동하기 전에 열린 글의 저장하지 않은 변경사항을 먼저 저장하거나 취소해 주세요.'
        )
      )
      return
    }

    const targetSection: 'knowledge' | 'drafts' = isDraftSection ? 'knowledge' : 'drafts'
    setBulkBusy('move')
    setSaveError(null)
    try {
      for (const path of paths) {
        await moveKnowledgeBetweenSections(path, targetSection)
      }
      const refreshed = await window.emprint.knowledge.list({ section })
      if (refreshed) setItems(refreshed)
      bumpWorkspaceGitRefresh()
      exitSelectionMode()
      if (activeDocumentPath && paths.includes(activeDocumentPath)) {
        const fileName = activeDocumentPath.split('/').pop()
        if (fileName) {
          const newPath = `${targetSection}/${fileName}`
          setActiveSection(targetSection === 'knowledge' ? 'contents' : 'drafts')
          openEditor(newPath)
        }
      }
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : typeof caught === 'string' ? caught : 'Unknown error'
      setSaveError(message)
    } finally {
      setBulkBusy(null)
    }
  }, [
    activeDocumentPath,
    bumpWorkspaceGitRefresh,
    exitSelectionMode,
    isDraftSection,
    locale,
    openEditor,
    section,
    selectedPaths,
    setActiveSection
  ])

  const handleImageFiles = useCallback(async (files: File[]): Promise<InsertedImage[]> => {
    if (files.length === 0) return []
    const inserted: InsertedImage[] = []
    const errors: string[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]!
      setImageNotice({ kind: 'uploading', count: files.length - i, current: file.name })

      const mime = file.type
      if (!isSupportedImageMime(mime)) {
        errors.push(
          pick(locale, `Unsupported image type: ${file.name}`, `지원하지 않는 이미지 형식: ${file.name}`)
        )
        continue
      }
      if (file.size > MAX_ASSET_IMAGE_BYTES) {
        errors.push(
          pick(
            locale,
            `"${file.name}" exceeds the 20MB upload limit (${(file.size / (1024 * 1024)).toFixed(1)}MB). GitHub push could break with large images.`,
            `"${file.name}"이(가) 20MB 업로드 제한을 초과합니다 (${(file.size / (1024 * 1024)).toFixed(1)}MB). 큰 이미지는 GitHub push가 실패할 수 있어요.`
          )
        )
        continue
      }

      try {
        const compressed = await compressImage(file, file.name)
        const saved = await window.emprint.assets.saveImage({
          fileName: compressed.fileName,
          data: compressed.bytes,
          mimeType: compressed.mimeType
        })
        inserted.push({
          src: workspaceAssetPathToAssetUrl(saved.path),
          alt: file.name.replace(/\.[a-z0-9]+$/i, '')
        })
      } catch (caught) {
        errors.push(caught instanceof Error ? caught.message : `Failed to upload ${file.name}`)
      }
    }

    if (errors.length > 0) {
      setImageNotice({ kind: 'error', message: errors.join(' · ') })
    } else if (inserted.length > 0) {
      bumpWorkspaceGitRefresh()
      setImageNotice({
        kind: 'success',
        message: pick(
          locale,
          `${inserted.length} image${inserted.length === 1 ? '' : 's'} added to assets/images/.`,
          `${inserted.length}개의 이미지를 assets/images/에 추가했습니다.`
        )
      })
      window.setTimeout(() => setImageNotice(null), 3500)
    } else {
      setImageNotice(null)
    }

    return inserted
  }, [bumpWorkspaceGitRefresh, locale])

  useEffect(() => {
    setTransitionKey((key) => key + 1)
  }, [surface, activeDocumentPath])

  // Rendered once for all three surfaces (list / viewer / editor) — the
  // dialog itself uses a portal, so it survives transitions between modes.
  const deleteDialog = (
    <PostDeleteDialog
      open={pendingDelete !== null}
      locale={locale}
      section={section}
      title={pendingDelete?.kind === 'single' ? pendingDelete.title : ''}
      path={pendingDelete?.kind === 'single' ? pendingDelete.path : ''}
      {...(pendingDelete?.kind === 'bulk' ? { bulkCount: pendingDelete.paths.length } : {})}
      deleting={
        bulkBusy === 'delete' ||
        (pendingDelete?.kind === 'single' &&
          deletingPath !== null &&
          deletingPath === pendingDelete.path)
      }
      onCancel={() => setPendingDelete(null)}
      onConfirm={() => void confirmDelete()}
    />
  )

  if (surface === 'viewer' && activeDocumentPath) {
    const viewerParsed = parseKnowledge(activeContent)
    return (
      <>
      <div
        key={`viewer:${transitionKey}`}
        className={cn(
          'w-full opacity-100 transition duration-300 ease-out',
          isEmbedded ? 'px-0 py-0' : 'mx-auto max-w-[980px] px-4 py-10 lg:px-10'
        )}
      >
        <div className="mb-8 flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            type="button"
            className="h-8 w-8 shrink-0 p-0"
            aria-label={pick(locale, 'Back to list', '목록으로')}
            title={pick(locale, 'Back', '목록')}
            onClick={handleDocumentBack}
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2} />
          </Button>
          <div className="flex items-center gap-2">
            <Tooltip label={pick(locale, 'Edit', '편집')}>
              <Button
                variant="outline"
                type="button"
                className="h-8 w-8 shrink-0 p-0"
                aria-label={pick(locale, 'Edit', '편집')}
                onClick={() => openEditor(activeDocumentPath)}
              >
                <SquarePen className="h-4 w-4" strokeWidth={2} />
              </Button>
            </Tooltip>
            <Tooltip label={pick(locale, 'Delete', '삭제')}>
              <Button
                variant="outline"
                type="button"
                className="h-8 w-8 shrink-0 border-danger/40 p-0 text-dangerInk hover:border-danger hover:bg-dangerBg/40"
                aria-label={pick(locale, 'Delete', '삭제')}
                onClick={() =>
                  requestDelete(
                    activeSummary?.title
                      ? { path: activeDocumentPath, title: activeSummary.title }
                      : { path: activeDocumentPath }
                  )
                }
                disabled={deletingPath === activeDocumentPath}
              >
                {deletingPath === activeDocumentPath ? (
                  <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                ) : (
                  <Trash2 className="h-4 w-4" strokeWidth={2} />
                )}
              </Button>
            </Tooltip>
          </div>
        </div>

        <header className="mb-10">
          <div className="flex flex-wrap items-center gap-2">
            {/* Folder is the source of truth: only show the draft badge for
                files that live in `drafts/`. Posts in `posts/` are by
                definition published, so the badge would be redundant. */}
            {isDraftSection ? <Badge>{locale === 'ko' ? '드래프트' : 'Draft'}</Badge> : null}
            <div className="text-xs text-muted">{formatKnowledgeDate(activeSummary?.updatedAt ?? '')}</div>
          </div>
          <h1 className="mt-3 text-[2.35rem] font-semibold tracking-[-0.035em] text-ink">
            {activeSummary?.title ?? ''}
          </h1>
          {activeSummary?.index ? (
            <div className="mt-2 font-mono text-xs text-muted">{activeSummary.index}</div>
          ) : null}
          {activeSummary?.tags?.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {activeSummary.tags.map((tag) => (
                <Badge key={tag}>{tag}</Badge>
              ))}
            </div>
          ) : null}
        </header>

        <article className="prose-emprint max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            urlTransform={(url) => {
              if (url.startsWith('emprint-asset://')) return url
              const clean = url.replace(/^\.\//, '')
              if (clean.startsWith('/assets/') || clean.startsWith('assets/')) {
                return workspaceAssetPathToAssetUrl(clean)
              }
              return url
            }}
          >
            {viewerParsed.body}
          </ReactMarkdown>
        </article>
      </div>
      {deleteDialog}
      </>
    )
  }

  if (surface === 'editor' && activeDocumentPath) {
    return (
      <>
      <div
        key={`editor:${transitionKey}`}
        className={cn(
          'w-full opacity-100 transition duration-300 ease-out',
          isEmbedded ? 'px-0 py-0' : 'mx-auto max-w-[1100px] px-4 py-8 lg:px-10'
        )}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <Tooltip label={pick(locale, 'Back', '뒤로가기')}>
            <Button
              variant="ghost"
              type="button"
              className="h-8 w-8 shrink-0 p-0"
              aria-label={pick(locale, 'Back', '뒤로가기')}
              onClick={() => openDocument(activeDocumentPath)}
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={2} />
            </Button>
          </Tooltip>
          <div className="flex items-center gap-2">
            <Tooltip label={pick(locale, saving ? 'Saving…' : 'Save', saving ? '저장 중…' : '저장')}>
              <Button
                type="button"
                className="h-8 w-8 shrink-0 p-0"
                aria-label={pick(locale, 'Save', '저장')}
                onClick={() => {
                setSaving(true)
                setSaveError(null)
                void (async () => {
                  try {
                    const existing = parseKnowledge(activeContent)
                    const nextData = knowledgeFrontmatterFromEditor({
                      existing: existing.data,
                      title: editorTitle,
                      tags: editorTags,
                      index: editorIndex,
                      draft: isDraftSection
                    })
                    // Transform `emprint-asset://...` URLs back to root-relative paths
                    // so the markdown on disk is portable to static-site builds.
                    const bodyForDisk = rewriteAssetUrlsForDisk(editorBody)
                    const nextMarkdown = buildKnowledgeMarkdown({ data: nextData, body: bodyForDisk })
                    await window.emprint.knowledge.save({
                      path: activeDocumentPath,
                      content: nextMarkdown
                    })
                    setActiveContent(nextMarkdown)
                    const trimmedTitle = editorTitle.trim() || inferTitleFromPath(activeDocumentPath)
                    const nextTags = normalizeTagArray(editorTags)
                    setEditorTitle(trimmedTitle)
                    setTagDraft(nextTags.join(', '))
                    const nextIndex = normalizeIndexPath(editorIndex)
                    setEditorIndex(nextIndex)
                    setLoadedSnapshot({
                      title: trimmedTitle,
                      tags: nextTags,
                      index: nextIndex,
                      body: editorBody
                    })
                    setActiveDocumentDirty(false)
                    bumpWorkspaceGitRefresh()
                    const refreshed = await window.emprint.knowledge.list({ section })
                    if (refreshed) setItems(refreshed)
                    const tree = await window.emprint.index.tree()
                    setIndexTree(tree)
                    await notifyMutated()
                  } catch (caught) {
                    const message = caught instanceof Error ? caught.message : String(caught)
                    setSaveError(message)
                    console.error('[emprint] post save failed', caught)
                  } finally {
                    setSaving(false)
                  }
                })()
                }}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} aria-hidden />
                ) : (
                  <Save className="h-4 w-4" strokeWidth={2} />
                )}
              </Button>
            </Tooltip>
            <Tooltip label={pick(locale, 'Delete', '삭제')}>
              <Button
                variant="outline"
                type="button"
                className="h-8 w-8 shrink-0 border-danger/40 p-0 text-dangerInk hover:border-danger hover:bg-dangerBg/40"
                aria-label={pick(locale, 'Delete', '삭제')}
                onClick={() =>
                  requestDelete(
                    activeSummary?.title
                      ? { path: activeDocumentPath, title: activeSummary.title }
                      : { path: activeDocumentPath }
                  )
                }
                disabled={saving || moving || deletingPath === activeDocumentPath}
              >
                {deletingPath === activeDocumentPath ? (
                  <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                ) : (
                  <Trash2 className="h-4 w-4" strokeWidth={2} />
                )}
              </Button>
            </Tooltip>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-panel">
          <div className="flex items-center justify-between border-b border-border bg-panel2 px-4 py-3">
            <div className="truncate text-sm font-medium text-ink">{activeSummary?.title ?? activeDocumentPath}</div>
            <div className="text-[11px] text-muted">{formatKnowledgeDate(activeSummary?.updatedAt ?? '')}</div>
          </div>
          <div className="space-y-4 px-4 py-5">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_340px]">
              <label className="space-y-1.5">
                <div className="text-[11px] uppercase tracking-[0.16em] text-muted">{locale === 'ko' ? '제목' : 'Title'}</div>
                <input
                  value={editorTitle}
                  onChange={(event) => setEditorTitle(event.target.value)}
                  placeholder={locale === 'ko' ? '제목' : 'Title'}
                  className="h-10 w-full rounded-md border border-border bg-panel px-3 text-sm text-ink outline-none transition placeholder:text-muted/70 focus:border-accent/60 focus:ring-1 focus:ring-accent/40"
                />
              </label>

              <label className="space-y-1.5">
                <div className="text-[11px] uppercase tracking-[0.16em] text-muted">{locale === 'ko' ? '인덱스' : 'Index'}</div>
                <input
                  value={editorIndex}
                  onChange={(event) => setEditorIndex(event.target.value)}
                  onBlur={() => setEditorIndex(normalizeIndexPath(editorIndex))}
                  list="knowledge-index-suggestions"
                  placeholder={locale === 'ko' ? '예: Science/Physics' : 'e.g. Science/Physics'}
                  className="h-10 w-full rounded-md border border-border bg-panel px-3 font-mono text-sm text-ink outline-none transition placeholder:text-muted/70 focus:border-accent/60 focus:ring-1 focus:ring-accent/40"
                />
                <datalist id="knowledge-index-suggestions">
                  {indexSuggestions.map((path) => (
                    <option key={path} value={path} />
                  ))}
                </datalist>
              </label>

              <div className="space-y-1.5">
                <div className="text-[11px] uppercase tracking-[0.16em] text-muted">{locale === 'ko' ? '태그' : 'Tags'}</div>
                <div
                  className={cn(
                    'h-10 w-full cursor-text overflow-hidden rounded-md border border-border bg-panel',
                    'focus-within:border-accent/60 focus-within:ring-1 focus-within:ring-accent/40'
                  )}
                  onMouseDown={() => {
                    window.requestAnimationFrame(() => tagTailInputRef.current?.focus())
                  }}
                >
                  <div className="flex h-full min-h-0 flex-wrap content-start items-center gap-1 overflow-y-auto overflow-x-hidden px-2 py-1">
                    {committedTagParts.map((tag, index) => (
                      <Badge key={`${index}:${tag}`} className="shrink-0">
                        {tag}
                      </Badge>
                    ))}
                    <input
                      ref={tagTailInputRef}
                      type="text"
                      value={tagTail}
                      onChange={(e) => handleTagTailChange(e.target.value)}
                      onKeyDown={handleTagTailKeyDown}
                      onBlur={handleTagFieldBlur}
                      onClick={(e) => e.stopPropagation()}
                      placeholder={
                        committedTagParts.length === 0 && tagTail === ''
                          ? locale === 'ko'
                            ? '쉼표로 구분 (예: 글쓰기, 메모)'
                            : 'Comma-separated (e.g. writing, notes)'
                          : undefined
                      }
                      aria-label={locale === 'ko' ? '태그 입력' : 'Tags'}
                      className="min-w-[6ch] flex-[1_1_6rem] border-0 bg-transparent py-0.5 text-sm leading-5 text-ink outline-none placeholder:text-muted/70"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-md border border-border bg-panel px-3 py-2">
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-[0.16em] text-muted">
                  {locale === 'ko' ? '상태' : 'Status'}
                </div>
                <div className="mt-0.5 text-sm text-ink">
                  {isDraftSection
                    ? (locale === 'ko' ? '드래프트' : 'Draft')
                    : (locale === 'ko' ? '발행됨' : 'Published')}
                </div>
              </div>
              <Tooltip
                label={
                  isDraftSection
                    ? pick(locale, 'Publish to Knowledge', '발행하기 (Knowledge로 이동)')
                    : pick(locale, 'Move to Drafts', '드래프트로 되돌리기')
                }
              >
                <Button
                  variant="outline"
                  type="button"
                  className="h-8 shrink-0 gap-1.5 px-3 text-[12px]"
                  aria-label={
                    isDraftSection
                      ? (locale === 'ko' ? '발행' : 'Publish')
                      : (locale === 'ko' ? '드래프트로 이동' : 'Move to drafts')
                  }
                  disabled={moving || saving}
                  onClick={() => {
                    void handleMoveSection()
                  }}
                >
                  {moving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} aria-hidden />
                  ) : isDraftSection ? (
                    <Send className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                  ) : (
                    <FileDown className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                  )}
                  <span>
                    {isDraftSection
                      ? (locale === 'ko' ? '발행' : 'Publish')
                      : (locale === 'ko' ? '드래프트로' : 'To drafts')}
                  </span>
                </Button>
              </Tooltip>
            </div>

            {saveError ? (
              <div
                className="flex items-start gap-2 rounded-md border border-danger/40 bg-dangerBg px-3 py-2 text-[12px] text-dangerInk"
                role="alert"
              >
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
                <div className="min-w-0 flex-1">
                  <div className="font-medium">
                    {pick(locale, 'Save failed', '저장 실패')}
                  </div>
                  <div className="mt-0.5 break-words font-mono text-[11px]">{saveError}</div>
                </div>
              </div>
            ) : null}

            {imageNotice ? (
              <div
                className={cn(
                  'flex items-start gap-2 rounded-md border px-3 py-2 text-[12px]',
                  imageNotice.kind === 'error'
                    ? 'border-danger/40 bg-dangerBg text-dangerInk'
                    : imageNotice.kind === 'uploading'
                      ? 'border-border bg-panel2 text-ink'
                      : 'border-accent/40 bg-panel2/80 text-ink'
                )}
                role={imageNotice.kind === 'error' ? 'alert' : 'status'}
              >
                {imageNotice.kind === 'uploading' ? (
                  <Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin" strokeWidth={2} aria-hidden />
                ) : imageNotice.kind === 'error' ? (
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
                ) : null}
                <div className="min-w-0 flex-1">
                  {imageNotice.kind === 'uploading'
                    ? pick(
                        locale,
                        `Uploading ${imageNotice.current ?? 'image'} (${imageNotice.count} remaining)…`,
                        `이미지 업로드 중: ${imageNotice.current ?? ''} (남은 ${imageNotice.count}개)`
                      )
                    : imageNotice.message}
                </div>
              </div>
            ) : null}

            <TipTapEditor
              key={activeDocumentPath}
              value={editorBody}
              onChange={setEditorBody}
              placeholder={locale === 'ko' ? '쓰기…' : 'Write…'}
              onImageFiles={handleImageFiles}
            />
          </div>
        </div>
      </div>
      {deleteDialog}
      </>
    )
  }

  if (isEmbedded) {
    return null
  }

  return (
    <>
    <div
      key={`list:${transitionKey}`}
      className="mx-auto w-full max-w-[1180px] px-4 py-8 opacity-100 transition duration-300 ease-out lg:px-10"
    >
      <div className="mb-4 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-[0.16em] text-muted">
            {isDraftSection ? 'Drafts' : 'Knowledge'}
          </div>
          <div className="mt-2 text-[22px] font-semibold tracking-[-0.03em] text-ink">
            {isDraftSection
              ? (locale === 'ko' ? '작성 중인 항목' : 'Work in progress')
              : (locale === 'ko' ? '발행한 지식' : 'Published knowledge')}
          </div>
          <div className="mt-1 text-xs text-muted">
            {isDraftSection
              ? (locale === 'ko'
                  ? '아직 발행하지 않은 항목. 발행 버튼으로 Knowledge로 이동합니다.'
                  : 'Not published yet. Use the publish action to move into Knowledge.')
              : (locale === 'ko'
                  ? '발행된 항목. 다시 작성하려면 드래프트로 되돌릴 수 있습니다.'
                  : 'Published entries. Send back to drafts to keep editing privately.')}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {!selectionMode ? (
            <Button
              variant="outline"
              type="button"
              className="h-8 gap-1.5 px-3 text-[12px]"
              aria-label={pick(locale, 'Select multiple', '다중 선택')}
              onClick={() => setSelectionMode(true)}
              disabled={items.length === 0 || saving || bulkBusy !== null}
            >
              <ListChecks className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              <span>{pick(locale, 'Select', '선택')}</span>
            </Button>
          ) : null}
          <Button
            variant="outline"
            type="button"
            className="h-8 w-8 shrink-0 p-0"
            aria-label={locale === 'ko' ? '새 항목' : 'New entry'}
            title={locale === 'ko' ? '새 항목' : 'New'}
            disabled={selectionMode || saving || bulkBusy !== null}
            onClick={() => {
            const path = allocateDatedMarkdownPath(
              section,
              items.map((item) => item.path)
            )
            const template = buildNewKnowledgeTemplate({ draft: isDraftSection })
            setSaving(true)
            setSaveError(null)
            void (async () => {
              try {
                await window.emprint.knowledge.save({ path, content: template })
                bumpWorkspaceGitRefresh()
                const refreshed = await window.emprint.knowledge.list({ section })
                if (refreshed) setItems(refreshed)
                openEditor(path)
              } catch (caught) {
                const message = caught instanceof Error ? caught.message : String(caught)
                setSaveError(message)
                console.error('[emprint] new knowledge failed', caught)
              } finally {
                setSaving(false)
              }
            })()
          }}
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} aria-hidden />
          ) : (
            <FilePlus className="h-4 w-4" strokeWidth={2} />
          )}
        </Button>
        </div>
      </div>

      <div className="relative mb-4">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
          strokeWidth={2}
          aria-hidden
        />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={
            locale === 'ko'
              ? '제목, 설명, 인덱스, 태그, 경로로 검색…'
              : 'Search title, description, index, tags, body…'
          }
          aria-label={pick(locale, 'Search knowledge', '지식 검색')}
          className="h-10 pl-9"
        />
      </div>
      {searchLoading && useDeepSearch ? (
        <p className="mb-3 text-[11px] text-muted">{pick(locale, 'Searching…', '검색 중…')}</p>
      ) : null}

      {selectionMode ? (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-panel2/50 px-3 py-2.5">
          <span className="text-[12px] text-ink">
            {pick(locale, `${selectedCount} selected`, `${selectedCount}개 선택`)}
          </span>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              type="button"
              className="h-8 px-3 text-[12px]"
              onClick={toggleSelectAllFiltered}
              disabled={filteredItems.length === 0 || bulkBusy !== null}
            >
              {allFilteredSelected
                ? pick(locale, 'Deselect all', '전체 해제')
                : pick(locale, 'Select all', '전체 선택')}
            </Button>
            <Button
              variant="outline"
              type="button"
              className="h-8 gap-1.5 px-3 text-[12px]"
              disabled={selectedCount === 0 || bulkBusy !== null}
              onClick={() => void handleBulkMoveSection()}
            >
              {bulkBusy === 'move' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} aria-hidden />
              ) : isDraftSection ? (
                <Send className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              ) : (
                <FileDown className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              )}
              <span>
                {isDraftSection
                  ? pick(locale, 'Publish', '발행')
                  : pick(locale, 'To drafts', '드래프트로')}
              </span>
            </Button>
            <Button
              variant="outline"
              type="button"
              className="h-8 gap-1.5 border-danger/40 px-3 text-[12px] text-dangerInk hover:border-danger hover:bg-dangerBg/40"
              disabled={selectedCount === 0 || bulkBusy !== null}
              onClick={requestBulkDelete}
            >
              {bulkBusy === 'delete' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} aria-hidden />
              ) : (
                <Trash2 className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              )}
              <span>{pick(locale, 'Delete', '삭제')}</span>
            </Button>
            <Button
              variant="ghost"
              type="button"
              className="h-8 w-8 p-0"
              aria-label={pick(locale, 'Exit selection', '선택 종료')}
              onClick={exitSelectionMode}
              disabled={bulkBusy !== null}
            >
              <X className="h-4 w-4" strokeWidth={2} aria-hidden />
            </Button>
          </div>
        </div>
      ) : null}

      {saveError && surface === 'list' ? (
        <div
          className="mb-3 flex items-start gap-2 rounded-md border border-danger/40 bg-dangerBg px-3 py-2 text-[12px] text-dangerInk"
          role="alert"
        >
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
          <div className="min-w-0 flex-1 break-words font-mono text-[11px]">{saveError}</div>
        </div>
      ) : null}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        {!isDraftSection && indexTree.length > 0 ? (
          <aside className="w-full shrink-0 lg:w-52">
            <div className="text-[11px] uppercase tracking-[0.16em] text-muted">
              {locale === 'ko' ? '인덱스' : 'Index'}
            </div>
            <nav className="mt-2 space-y-0.5 rounded-lg border border-border bg-panel2/40 p-2">
              <button
                type="button"
                className={cn(
                  'w-full rounded-md px-2 py-1.5 text-left text-[12px] transition',
                  indexFilter === null ? 'bg-panel text-ink' : 'text-muted hover:bg-panel/80 hover:text-ink'
                )}
                onClick={() => setIndexFilter(null)}
              >
                {pick(locale, 'All', '전체')}
              </button>
              <button
                type="button"
                className={cn(
                  'w-full rounded-md px-2 py-1.5 text-left text-[12px] transition',
                  indexFilter === '__none__' ? 'bg-panel text-ink' : 'text-muted hover:bg-panel/80 hover:text-ink'
                )}
                onClick={() => setIndexFilter('__none__')}
              >
                {pick(locale, 'No index', '인덱스 없음')}
              </button>
              <IndexFilterTree
                nodes={indexTree}
                selected={indexFilter}
                onSelect={(path) => setIndexFilter(path)}
              />
            </nav>
          </aside>
        ) : null}

        <div className="min-w-0 flex-1 grid gap-2">
        {loading ? (
          <Card className="px-4 py-6 text-sm text-muted">{locale === 'ko' ? '불러오는 중…' : 'Loading…'}</Card>
        ) : items.length === 0 ? (
          <Card className="px-4 py-10 text-center text-sm text-muted">
            {isDraftSection
              ? (locale === 'ko'
                  ? '작성 중인 글이 없어요. 새 항목을 시작해보세요.'
                  : 'No drafts in progress. Start a new one.')
              : (locale === 'ko'
                  ? '아직 발행한 글이 없어요.'
                  : 'No published entries yet.')}
          </Card>
        ) : filteredItems.length === 0 ? (
          <Card className="px-4 py-10 text-center text-sm text-muted">
            {pick(locale, 'No entries match your search.', '검색 결과가 없습니다.')}
          </Card>
        ) : (
          filteredItems.map(({ item, snippet }) => {
            const isSelected = selectedPaths.has(item.path)
            return (
              <div
                key={item.path}
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (selectionMode) {
                    toggleSelectedPath(item.path)
                    return
                  }
                  openDocument(item.path)
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    if (selectionMode) {
                      toggleSelectedPath(item.path)
                    } else {
                      openDocument(item.path)
                    }
                  }
                }}
                className={cn(
                  'group relative cursor-pointer rounded-lg border bg-surface px-4 py-4 text-left transition hover:bg-panel2/60',
                  'focus:outline-none focus:ring-1 focus:ring-accent/35',
                  isSelected ? 'border-accent/50 ring-1 ring-accent/25' : 'border-border'
                )}
              >
                <div className="flex items-start gap-3">
                  {selectionMode ? (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectedPath(item.path)}
                      onClick={(event) => event.stopPropagation()}
                      aria-label={pick(locale, `Select ${item.title}`, `${item.title} 선택`)}
                      className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-accent"
                    />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-ink">{item.title}</div>
                        {item.index ? (
                          <div className="mt-0.5 truncate font-mono text-[11px] text-muted">{item.index}</div>
                        ) : null}
                        <div className="mt-1 text-xs text-muted">{formatKnowledgeDate(item.updatedAt)}</div>
                      </div>
                      {!selectionMode ? (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            requestDelete({ path: item.path, title: item.title })
                          }}
                          disabled={deletingPath === item.path || bulkBusy !== null}
                          aria-label={pick(
                            locale,
                            `Delete ${item.title || item.path}`,
                            `${item.title || item.path} 삭제`
                          )}
                          title={pick(locale, 'Delete', '삭제')}
                          className={cn(
                            'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border border-transparent text-muted opacity-0 transition focus:opacity-100 focus:outline-none focus:ring-1 focus:ring-accent/40 group-hover:opacity-100',
                            'hover:border-danger/40 hover:bg-dangerBg/40 hover:text-dangerInk'
                          )}
                        >
                          {deletingPath === item.path ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} aria-hidden />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                          )}
                        </button>
                      ) : null}
                    </div>
                    <div className="mt-2 text-sm leading-6 text-muted">
                      {snippet?.trim()
                        ? snippet
                        : item.description?.trim()
                          ? item.description
                          : activeDocumentPath === item.path
                            ? snippetFromMarkdown(activeContent)
                            : ''}
                    </div>
                    {item.tags?.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.tags.slice(0, 6).map((tag) => (
                          <Badge key={tag}>{tag}</Badge>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            )
          })
        )}
        </div>
      </div>
    </div>
    {deleteDialog}
    </>
  )
}

function IndexFilterTree({
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
        const isOpen = expanded[node.path] ?? depth < 1
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
              <IndexFilterTree nodes={node.children} selected={selected} onSelect={onSelect} depth={depth + 1} />
            ) : null}
          </div>
        )
      })}
    </>
  )
}

