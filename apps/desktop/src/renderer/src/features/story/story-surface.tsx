import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, Loader2, Save } from 'lucide-react'
import matter from 'gray-matter'
import { BOOK_STORY_RELATIVE_PATH } from '@emprint/shared'
import type { AppLocale } from '@emprint/shared'
import { pick } from '@renderer/lib/i18n'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Tooltip } from '@renderer/components/ui/tooltip'
import { TipTapEditor } from '@renderer/components/editor/tiptap-editor'
import { useAppStore } from '@renderer/state/app-store'
import {
  rewriteAssetUrlsForDisk,
  rewriteAssetUrlsForEditor
} from '@renderer/lib/asset-paths'

function frontmatterForYaml(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) out[key] = value
  }
  return out
}

function buildStoryMarkdown(input: { data: Record<string, unknown>; body: string }): string {
  return matter.stringify(input.body ?? '', frontmatterForYaml(input.data ?? {}))
}

function parseStory(content: string): { data: Record<string, unknown>; body: string } {
  try {
    const parsed = matter(content)
    return { data: (parsed.data ?? {}) as Record<string, unknown>, body: parsed.content ?? '' }
  } catch {
    return { data: {}, body: content }
  }
}

export function StorySurface({ locale }: { locale: AppLocale }) {
  const setActiveDocumentTitle = useAppStore((state) => state.setActiveDocumentTitle)
  const setActiveDocumentDirty = useAppStore((state) => state.setActiveDocumentDirty)
  const bumpWorkspaceGitRefresh = useAppStore((state) => state.bumpWorkspaceGitRefresh)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [editorBody, setEditorBody] = useState('')
  const [editorTitle, setEditorTitle] = useState('')
  const [loadedTitle, setLoadedTitle] = useState('')
  const [loadedBody, setLoadedBody] = useState('')

  const loadStory = useCallback(async () => {
    setLoading(true)
    setSaveError(null)
    try {
      const result = await window.emprint.story.read()
      const parsed = parseStory(result.content)
      const title = typeof parsed.data.title === 'string' ? parsed.data.title : ''
      const body = rewriteAssetUrlsForEditor(parsed.body)
      setEditorTitle(title)
      setEditorBody(body)
      setLoadedTitle(title)
      setLoadedBody(body)
      setActiveDocumentTitle(title || pick(locale, 'Story', '이야기'))
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

  useEffect(() => {
    const dirty =
      editorTitle.trim() !== loadedTitle.trim() ||
      editorBody !== loadedBody
    setActiveDocumentDirty(dirty)
    setActiveDocumentTitle(editorTitle.trim() || pick(locale, 'Story', '이야기'))
  }, [editorBody, editorTitle, loadedBody, loadedTitle, locale, setActiveDocumentDirty, setActiveDocumentTitle])

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    try {
      const existing = parseStory(
        (await window.emprint.story.read()).content
      )
      const nextData: Record<string, unknown> = {
        ...existing.data,
        title: editorTitle.trim() || existing.data.title || pick(locale, 'Story', '이야기')
      }
      const bodyForDisk = rewriteAssetUrlsForDisk(editorBody)
      const nextMarkdown = buildStoryMarkdown({ data: nextData, body: bodyForDisk })
      await window.emprint.story.save({ content: nextMarkdown })
      const trimmedTitle = editorTitle.trim() || pick(locale, 'Story', '이야기')
      setEditorTitle(trimmedTitle)
      setLoadedTitle(trimmedTitle)
      setLoadedBody(editorBody)
      setActiveDocumentDirty(false)
      bumpWorkspaceGitRefresh()
    } catch (caught) {
      setSaveError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted">
        <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} aria-hidden />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-8 lg:px-10">
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
          <p className="text-xs text-muted font-mono">{BOOK_STORY_RELATIVE_PATH}</p>
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
      />
    </div>
  )
}
