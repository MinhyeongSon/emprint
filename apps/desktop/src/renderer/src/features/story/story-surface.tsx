import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ChevronDown, ChevronRight, ExternalLink, Loader2, Save } from 'lucide-react'
import { BOOK_STORY_RELATIVE_PATH } from '@emprint/shared'
import type { AppLocale } from '@emprint/shared'
import { pick } from '@renderer/lib/i18n'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Textarea } from '@renderer/components/ui/textarea'
import { Tooltip } from '@renderer/components/ui/tooltip'
import { TipTapEditor } from '@renderer/components/editor/tiptap-editor'
import { useAppStore } from '@renderer/state/app-store'
import { cn } from '@renderer/lib/cn'
import {
  rewriteAssetUrlsForDisk,
  rewriteAssetUrlsForEditor
} from '@renderer/lib/asset-paths'
import { useBookComposition } from './use-book-composition'
import {
  buildStoryMarkdown,
  countStoryStats,
  parseStory,
  readStoryFrontmatter,
  storyFrontmatterFromEditor,
  type StoryFrontmatter
} from './story-markdown'

export function StorySurface({ locale }: { locale: AppLocale }) {
  const setActiveDocumentTitle = useAppStore((state) => state.setActiveDocumentTitle)
  const setActiveDocumentDirty = useAppStore((state) => state.setActiveDocumentDirty)
  const setActiveSection = useAppStore((state) => state.setActiveSection)
  const bumpWorkspaceGitRefresh = useAppStore((state) => state.bumpWorkspaceGitRefresh)
  const { composition } = useBookComposition()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [metaOpen, setMetaOpen] = useState(false)
  const [editorBody, setEditorBody] = useState('')
  const [editorTitle, setEditorTitle] = useState('')
  const [description, setDescription] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [author, setAuthor] = useState('')
  const [loadedSnapshot, setLoadedSnapshot] = useState<StoryFrontmatter & { body: string }>({
    title: '',
    description: '',
    subtitle: '',
    author: '',
    body: ''
  })

  const loadStory = useCallback(async () => {
    setLoading(true)
    setSaveError(null)
    try {
      const result = await window.emprint.story.read()
      const parsed = parseStory(result.content)
      const fm = readStoryFrontmatter(parsed.data)
      const body = rewriteAssetUrlsForEditor(parsed.body)
      setEditorTitle(fm.title)
      setDescription(fm.description)
      setSubtitle(fm.subtitle)
      setAuthor(fm.author)
      setEditorBody(body)
      setLoadedSnapshot({ ...fm, body })
      setActiveDocumentTitle(fm.title || pick(locale, 'Story', '이야기'))
      setActiveDocumentDirty(false)
    } catch (caught) {
      setSaveError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setLoading(false)
    }
  }, [locale, setActiveDocumentDirty, setActiveDocumentTitle])

  useEffect(() => {
    void loadStory()
  }, [loadStory])

  const stats = useMemo(() => countStoryStats(editorBody), [editorBody])

  useEffect(() => {
    const dirty =
      editorTitle.trim() !== loadedSnapshot.title.trim() ||
      description.trim() !== loadedSnapshot.description.trim() ||
      subtitle.trim() !== loadedSnapshot.subtitle.trim() ||
      author.trim() !== loadedSnapshot.author.trim() ||
      editorBody !== loadedSnapshot.body
    setActiveDocumentDirty(dirty)
    setActiveDocumentTitle(editorTitle.trim() || pick(locale, 'Story', '이야기'))
  }, [
    author,
    description,
    editorBody,
    editorTitle,
    loadedSnapshot,
    locale,
    setActiveDocumentDirty,
    setActiveDocumentTitle,
    subtitle
  ])

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    try {
      const existing = parseStory((await window.emprint.story.read()).content)
      const trimmedTitle = editorTitle.trim() || pick(locale, 'Story', '이야기')
      const nextData = storyFrontmatterFromEditor({
        existing: existing.data,
        title: editorTitle,
        description,
        subtitle,
        author
      })
      const bodyForDisk = rewriteAssetUrlsForDisk(editorBody)
      const nextMarkdown = buildStoryMarkdown({ data: nextData, body: bodyForDisk })
      await window.emprint.story.save({ content: nextMarkdown })
      const snapshot: StoryFrontmatter = {
        title: trimmedTitle,
        description: description.trim(),
        subtitle: subtitle.trim(),
        author: author.trim()
      }
      setEditorTitle(trimmedTitle)
      setLoadedSnapshot({ ...snapshot, body: editorBody })
      setActiveDocumentDirty(false)
      bumpWorkspaceGitRefresh()
    } catch (caught) {
      setSaveError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setSaving(false)
    }
  }

  const layoutLabel =
    composition === 'scroll'
      ? pick(locale, 'Scroll', 'Scroll')
      : pick(locale, 'Pages', 'Pages')

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted">
        <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} aria-hidden />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-8 lg:px-10">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge className="normal-case tracking-normal text-[11px]">
          {pick(locale, 'Layout', '레이아웃')}: {layoutLabel}
        </Badge>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-[11px] text-accent hover:underline"
          onClick={() => setActiveSection('design')}
        >
          {pick(locale, 'Change in Design', 'Design에서 변경')}
          <ExternalLink className="h-3 w-3" strokeWidth={2} aria-hidden />
        </button>
        {composition === 'pages' ? (
          <span className="text-[11px] text-muted">
            {pick(locale, 'Pages split on', 'Pages는')} <code className="font-mono">---</code>{' '}
            {pick(locale, 'page breaks', '로 페이지를 나눕니다')}
          </span>
        ) : null}
      </div>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="text-[11px] uppercase tracking-[0.16em] text-muted">
            {pick(locale, 'Story', '이야기')}
          </div>
          <Input
            value={editorTitle}
            onChange={(e) => setEditorTitle(e.target.value)}
            className="h-10 border-0 bg-transparent px-0 text-lg font-semibold tracking-tight shadow-none focus-visible:ring-0"
            placeholder={pick(locale, 'Title', '제목')}
            aria-label={pick(locale, 'Title', '제목')}
          />
          <p className="font-mono text-xs text-muted">{BOOK_STORY_RELATIVE_PATH}</p>
        </div>
        <Tooltip label={pick(locale, saving ? 'Saving…' : 'Save', saving ? '저장 중…' : '저장')}>
          <Button type="button" className="h-9 gap-2 px-4" disabled={saving} onClick={() => void handleSave()}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} aria-hidden />
            ) : (
              <Save className="h-4 w-4" strokeWidth={2} aria-hidden />
            )}
            {pick(locale, 'Save', '저장')}
          </Button>
        </Tooltip>
      </div>

      <div className="mb-4 rounded-md border border-border bg-panel2/40">
        <button
          type="button"
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-ink"
          onClick={() => setMetaOpen((v) => !v)}
        >
          {metaOpen ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted" aria-hidden />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted" aria-hidden />
          )}
          {pick(locale, 'Story details', '이야기 정보')}
        </button>
        {metaOpen ? (
          <div className="space-y-3 border-t border-border px-3 py-3">
            <label className="block space-y-1">
              <span className="text-xs text-muted">{pick(locale, 'Subtitle', '부제')}</span>
              <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} className="h-8 text-sm" />
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-muted">{pick(locale, 'Description', '설명')}</span>
              <Textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="text-sm"
                placeholder={pick(locale, 'Short summary for readers and search', '독자·검색용 짧은 요약')}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-muted">{pick(locale, 'Author', '저자')}</span>
              <Input value={author} onChange={(e) => setAuthor(e.target.value)} className="h-8 text-sm" />
            </label>
          </div>
        ) : null}
      </div>

      {saveError ? (
        <div
          className="mb-4 flex items-start gap-2 rounded-md border border-danger/40 bg-dangerBg px-3 py-2 text-[12px] text-dangerInk"
          role="alert"
        >
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
          <div className="min-w-0 flex-1 break-words font-mono text-[11px]">{saveError}</div>
        </div>
      ) : null}

      <TipTapEditor
        value={editorBody}
        onChange={setEditorBody}
        placeholder={locale === 'ko' ? '이야기를 써 보세요…' : 'Write your story…'}
        showPageBreak={composition === 'pages'}
        pageBreakTitle={pick(locale, 'Insert page break', '페이지 나누기')}
        pageBreakDecorLabel={pick(locale, 'Page break', '페이지 나누기')}
        className="h-[calc(100vh-420px)] min-h-[320px]"
      />

      <p className={cn('mt-3 text-right text-[11px] tabular-nums text-muted')}>
        {pick(locale, `${stats.words} words · ${stats.characters} characters`, `${stats.words}단어 · ${stats.characters}자`)}
      </p>
    </div>
  )
}
