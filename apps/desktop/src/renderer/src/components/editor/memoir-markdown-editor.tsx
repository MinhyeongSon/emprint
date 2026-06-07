import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ImagePlus, List, ListOrdered, Loader2, Redo2, Undo2 } from 'lucide-react'
import type { AppLocale, AssetImageInfo } from '@emprint/shared'
import { pick } from '@renderer/lib/i18n'
import { workspaceAssetPathToAssetUrl } from '@renderer/lib/asset-paths'
import { EditorContent, useEditor } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import type { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { TextStyle } from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import { Markdown } from 'tiptap-markdown'
import { cn } from '@renderer/lib/cn'

interface MemoirMarkdownEditorProps {
  value: string
  onChange(nextMarkdown: string): void
  placeholder?: string
  className?: string
  /** When set, show toolbar control to insert `![](/assets/…)` from Assets library. */
  locale?: AppLocale
}

function ColorSwatch({
  color,
  ariaLabel,
  onClick
}: {
  color: string
  ariaLabel: string
  onClick(): void
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      title={ariaLabel}
      onClick={onClick}
      className="h-5 w-5 rounded-full border border-border/80 transition hover:scale-105"
      style={{ background: color }}
    />
  )
}

function ToolbarButton({
  active,
  onClick,
  ariaLabel,
  title,
  children
}: {
  active?: boolean
  onClick(): void
  ariaLabel: string
  title?: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      title={title ?? ariaLabel}
      className={cn(
        'inline-flex h-7 w-7 items-center justify-center rounded-sm border transition',
        active ? 'border-accent/50 bg-panel2 text-ink' : 'border-border/80 bg-panel text-muted hover:text-ink'
      )}
    >
      {children}
    </button>
  )
}

export function MemoirMarkdownEditor({
  value,
  onChange,
  placeholder,
  className,
  locale = 'en'
}: MemoirMarkdownEditorProps) {
  const editorRef = useRef<Editor | null>(null)
  const [assetOpen, setAssetOpen] = useState(false)
  const [assetLoading, setAssetLoading] = useState(false)
  const [assetImages, setAssetImages] = useState<AssetImageInfo[]>([])

  const loadAssetImages = useCallback(async () => {
    if (!window.emprint?.assets?.listImages) return
    setAssetLoading(true)
    try {
      setAssetImages(await window.emprint.assets.listImages())
    } finally {
      setAssetLoading(false)
    }
  }, [])

  const insertImageMarkdown = useCallback(
    (path: string) => {
      const snippet = `\n\n![${pick(locale, 'Image', '이미지')}](${path})\n\n`
      const trimmed = value.trimEnd()
      onChange(trimmed ? `${trimmed}${snippet}` : snippet.trim())
      setAssetOpen(false)
    },
    [locale, onChange, value]
  )

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: false,
        bold: false,
        italic: false,
        strike: false,
        code: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false
      }),
      TextStyle,
      Color.configure({ types: ['textStyle'] }),
      Placeholder.configure({
        placeholder: placeholder ?? ''
      }),
      Markdown.configure({
        html: true,
        transformPastedText: true,
        transformCopiedText: true
      })
    ],
    [placeholder]
  )

  const editor = useEditor({
    extensions,
    content: value,
    onContentError: ({ error }) => {
      console.error('[memoir-markdown] content parse error', error)
    },
    editorProps: {
      attributes: {
        class: 'tiptap prose-emprint max-w-none min-h-[6rem] focus:outline-none text-sm',
        role: 'textbox',
        'aria-multiline': 'true',
        spellcheck: 'true'
      }
    },
    onUpdate: ({ editor: ed }) => {
      const markdown =
        (ed.storage as { markdown?: { getMarkdown?: () => string } }).markdown?.getMarkdown?.() ?? ed.getText()
      onChange(markdown)
    }
  })

  useEffect(() => {
    editorRef.current = editor ?? null
  }, [editor])

  useEffect(() => {
    if (!editor || editor.isDestroyed) return
    const current =
      (editor.storage as { markdown?: { getMarkdown?: () => string } }).markdown?.getMarkdown?.() ?? ''
    if (current === value) return
    try {
      editor.commands.setContent(value, { emitUpdate: false })
    } catch (e) {
      console.error('[memoir-markdown] setContent failed', e)
    }
  }, [editor, value])

  if (!editor) {
    return null
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-border bg-panel2 px-2 py-1.5">
        <ToolbarButton
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          ariaLabel="Bullet list"
          title="Bullet list (-)"
        >
          <List className="h-3.5 w-3.5" strokeWidth={2.25} />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          ariaLabel="Numbered list"
          title="Numbered list (1.)"
        >
          <ListOrdered className="h-3.5 w-3.5" strokeWidth={2.25} />
        </ToolbarButton>
        <div className="mx-1 h-4 w-px bg-border/70" />
        <ColorSwatch
          color="var(--ink)"
          ariaLabel="Default text color"
          onClick={() => editor.chain().focus().unsetColor().run()}
        />
        <ColorSwatch
          color="#c4713f"
          ariaLabel="Accent text color"
          onClick={() => editor.chain().focus().setColor('#c4713f').run()}
        />
        <ColorSwatch
          color="#fca5a5"
          ariaLabel="Rose text color"
          onClick={() => editor.chain().focus().setColor('#fca5a5').run()}
        />
        <ColorSwatch
          color="#7fb9a7"
          ariaLabel="Mint text color"
          onClick={() => editor.chain().focus().setColor('#7fb9a7').run()}
        />
        <ColorSwatch
          color="#a7b6ff"
          ariaLabel="Periwinkle text color"
          onClick={() => editor.chain().focus().setColor('#a7b6ff').run()}
        />
        <div className="mx-1 h-4 w-px bg-border/70" />
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} ariaLabel="Undo" title="Undo">
          <Undo2 className="h-3.5 w-3.5" strokeWidth={2.25} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} ariaLabel="Redo" title="Redo">
          <Redo2 className="h-3.5 w-3.5" strokeWidth={2.25} />
        </ToolbarButton>
        <div className="mx-1 h-4 w-px bg-border/70" />
        <ToolbarButton
          active={assetOpen}
          onClick={() => {
            const next = !assetOpen
            setAssetOpen(next)
            if (next) void loadAssetImages()
          }}
          ariaLabel={pick(locale, 'Insert image from Assets', 'Assets에서 이미지 삽입')}
          title={pick(locale, 'Insert image from Assets', 'Assets에서 이미지 삽입')}
        >
          <ImagePlus className="h-3.5 w-3.5" strokeWidth={2.25} />
        </ToolbarButton>
      </div>

      {assetOpen ? (
        <div className="max-h-36 overflow-auto rounded-md border border-border bg-panel p-2">
          {assetLoading ? (
            <div className="flex justify-center py-4 text-muted">
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} aria-hidden />
            </div>
          ) : assetImages.length === 0 ? (
            <p className="py-3 text-center text-[11px] text-muted">
              {pick(
                locale,
                'No images in Assets yet. Upload from the Assets sidebar.',
                'Assets에 이미지가 없습니다. Assets 사이드바에서 업로드하세요.'
              )}
            </p>
          ) : (
            <ul className="grid grid-cols-4 gap-1.5">
              {assetImages.map((img) => (
                <li key={img.path}>
                  <button
                    type="button"
                    className="block w-full overflow-hidden rounded border border-border transition hover:border-accent/50"
                    onClick={() => insertImageMarkdown(img.path)}
                  >
                    <img
                      src={workspaceAssetPathToAssetUrl(img.path)}
                      alt={img.name}
                      className="aspect-square w-full object-cover"
                    />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      <BubbleMenu
        editor={editor}
        shouldShow={({ editor: ed, state }) => ed.isEditable && !state.selection.empty}
        options={{ placement: 'top' }}
        className="flex items-center gap-1 rounded-md border border-border bg-panel p-1 shadow-panel"
      >
        <ColorSwatch
          color="var(--ink)"
          ariaLabel="Default text color"
          onClick={() => editor.chain().focus().unsetColor().run()}
        />
        <ColorSwatch
          color="#c4713f"
          ariaLabel="Accent text color"
          onClick={() => editor.chain().focus().setColor('#c4713f').run()}
        />
        <ColorSwatch
          color="#fca5a5"
          ariaLabel="Rose text color"
          onClick={() => editor.chain().focus().setColor('#fca5a5').run()}
        />
        <ColorSwatch
          color="#7fb9a7"
          ariaLabel="Mint text color"
          onClick={() => editor.chain().focus().setColor('#7fb9a7').run()}
        />
        <ColorSwatch
          color="#a7b6ff"
          ariaLabel="Periwinkle text color"
          onClick={() => editor.chain().focus().setColor('#a7b6ff').run()}
        />
      </BubbleMenu>

      <div
        className="rounded-md border border-border bg-surface px-3 py-2"
        onClick={() => {
          if (!editor.isFocused) editor.commands.focus('end')
        }}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
