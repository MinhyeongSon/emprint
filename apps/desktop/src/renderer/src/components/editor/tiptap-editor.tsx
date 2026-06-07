import { useEffect, useMemo, useRef, type CSSProperties, type ReactNode } from 'react'
import {
  Bold,
  Braces,
  Code2,
  Heading1,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Redo2,
  SeparatorHorizontal,
  TextQuote,
  Undo2
} from 'lucide-react'
import { EditorContent, useEditor } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import type { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'
import { TextStyle } from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import { Markdown } from 'tiptap-markdown'
import { cn } from '@renderer/lib/cn'

/** Only http(s), workspace assets, and Emprint's custom asset protocol. Blocks `javascript:`, `data:`, etc. */
function sanitizeImageSrc(raw: string | null | undefined): string | null {
  if (raw == null || typeof raw !== 'string') return null
  const src = raw.trim()
  if (!src) return null
  const lower = src.toLowerCase()
  if (lower.startsWith('javascript:') || lower.startsWith('vbscript:') || lower.startsWith('data:')) return null
  if (src.startsWith('emprint-asset://')) return src
  if (src.startsWith('/assets/') || src.startsWith('assets/')) return src
  try {
    const u = new URL(src, 'https://emprint.invalid')
    if (u.protocol === 'https:' || u.protocol === 'http:') return src
  } catch {
    // Relative paths like `./pic.png` from pasted HTML — reject (we only ship known shapes).
    return null
  }
  return null
}

const EmprintImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      src: {
        default: null,
        parseHTML: (element) => sanitizeImageSrc(element.getAttribute('src'))
      }
    }
  }
})

export interface InsertedImage {
  /** Final URL to embed in the editor (typically an `emprint-asset://` URL). */
  src: string
  alt?: string
  title?: string
}

interface TipTapEditorProps {
  value: string
  onChange(nextMarkdown: string): void
  placeholder?: string
  /**
   * Class applied to the outer editor container. Use this to override the
   * default fixed height (`h-[calc(100vh-320px)] min-h-[360px]`). The
   * container is a flex column whose body scrolls internally when content
   * overflows, so callers should size the container, not the inner editor.
   */
  className?: string
  /**
   * Called whenever the user drops or pastes one or more image files into the editor.
   * Implementations should upload the file(s) and resolve to the URLs that should be
   * embedded as image nodes. Reject (or resolve to an empty array) to skip insertion.
   */
  onImageFiles?(files: File[]): Promise<InsertedImage[]>
  /** Extra toolbar controls rendered after the default formatting buttons. */
  toolbarEnd?: ReactNode
  /** When true, show a toolbar button that inserts a markdown page break (`---`). */
  showPageBreak?: boolean
  pageBreakTitle?: string
  /** Label shown on decorated horizontal rules in the editor (Pages layout). */
  pageBreakDecorLabel?: string
}

function collectImageFilesFromDataTransfer(dt: DataTransfer | null | undefined): File[] {
  if (!dt) return []
  const files: File[] = []
  for (const file of Array.from(dt.files ?? [])) {
    if (file.type.startsWith('image/')) files.push(file)
  }
  if (files.length === 0) {
    for (const item of Array.from(dt.items ?? [])) {
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const f = item.getAsFile()
        if (f) files.push(f)
      }
    }
  }
  return files
}

export function TipTapEditor({
  value,
  onChange,
  placeholder,
  className,
  onImageFiles,
  toolbarEnd,
  showPageBreak,
  pageBreakTitle = 'Insert page break',
  pageBreakDecorLabel = 'Page break'
}: TipTapEditorProps) {
  const onImageFilesRef = useRef(onImageFiles)
  const editorRef = useRef<Editor | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    onImageFilesRef.current = onImageFiles
  }, [onImageFiles])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const insertRef = useRef<(items: InsertedImage[]) => void>(() => {})

  // Stable extension instances — a fresh `extensions: [...]` every render
  // makes TipTap diff options on each frame and repeatedly `setOptions`.
  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] }
      }),
      TextStyle,
      Color.configure({ types: ['textStyle'] }),
      EmprintImage.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: {
          class: 'rounded-md border border-border/60 bg-panel2/40'
        }
      }),
      Placeholder.configure({
        placeholder: placeholder ?? ''
      }),
      Markdown.configure({
        html: false,
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
      console.error('[tiptap] content parse error', error)
    },
    editorProps: {
      attributes: {
        // Typography only — sizing/scroll is owned by the outer container so
        // long content does not push the page; it scrolls inside the editor.
        class: 'tiptap prose-emprint max-w-none focus:outline-none',
        role: 'textbox',
        'aria-multiline': 'true',
        spellcheck: 'true'
      },
      handleDrop: (_view, event) => {
        const files = collectImageFilesFromDataTransfer(event.dataTransfer)
        if (files.length === 0) return false
        event.preventDefault()
        const handler = onImageFilesRef.current
        if (!handler) return true
        void (async () => {
          try {
            const inserted = await handler(files)
            if (!mountedRef.current) return
            insertRef.current(inserted)
          } catch {
            // Caller is responsible for surfacing the error.
          }
        })()
        return true
      },
      handlePaste: (_view, event) => {
        const files = collectImageFilesFromDataTransfer(event.clipboardData)
        if (files.length === 0) return false
        event.preventDefault()
        const handler = onImageFilesRef.current
        if (!handler) return true
        void (async () => {
          try {
            const inserted = await handler(files)
            if (!mountedRef.current) return
            insertRef.current(inserted)
          } catch {
            // ignore
          }
        })()
        return true
      }
    },
    onUpdate: ({ editor }) => {
      const markdown = (editor.storage as any).markdown?.getMarkdown?.() ?? editor.getText()
      onChange(markdown)
    }
  })

  useEffect(() => {
    editorRef.current = editor ?? null
  }, [editor])

  useEffect(() => {
    insertRef.current = (items: InsertedImage[]) => {
      const ed = editorRef.current
      if (!mountedRef.current || !ed || ed.isDestroyed || items.length === 0) return
      const chain = ed.chain().focus()
      let any = false
      for (const item of items) {
        const safe = sanitizeImageSrc(item.src)
        if (!safe) continue
        any = true
        const attrs: { src: string; alt?: string; title?: string } = { src: safe }
        if (item.alt) attrs.alt = item.alt
        if (item.title) attrs.title = item.title
        chain.setImage(attrs)
        chain.enter()
      }
      if (any) chain.run()
    }
  }, [])

  useEffect(() => {
    if (!editor || editor.isDestroyed) return
    const current = (editor.storage as any).markdown?.getMarkdown?.() ?? ''
    if (current === value) return
    try {
      editor.commands.setContent(value, { emitUpdate: false })
    } catch (e) {
      console.error('[tiptap] setContent failed', e)
    }
  }, [editor, value])

  if (!editor) {
    return null
  }

  return (
    <div
      className={cn(
        // Bounded, viewport-relative height keeps the editor stable; long
        // documents scroll inside the body below rather than pushing the page.
        'flex h-[calc(100vh-320px)] min-h-[360px] flex-col gap-3',
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-panel2 px-3 py-2 text-[12px] text-muted">
        <div className="flex flex-wrap items-center gap-1.5">
          <ToolbarButton
            active={editor.isActive('bold')}
            onClick={() => editor.chain().focus().toggleBold().run()}
            ariaLabel="Bold"
            title="Bold (Ctrl+B)"
          >
            <Bold className="h-3.5 w-3.5" strokeWidth={2.25} />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive('italic')}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            ariaLabel="Italic"
            title="Italic (Ctrl+I)"
          >
            <Italic className="h-3.5 w-3.5" strokeWidth={2.25} />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive('code')}
            onClick={() => editor.chain().focus().toggleCode().run()}
            ariaLabel="Inline code"
            title="Inline code"
          >
            <Code2 className="h-3.5 w-3.5" strokeWidth={2.25} />
          </ToolbarButton>
          <div className="mx-1 h-4 w-px bg-border/70" />
          <ToolbarButton
            active={editor.isActive('heading', { level: 1 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            ariaLabel="Heading 1"
            title="Heading 1"
          >
            <Heading1 className="h-3.5 w-3.5" strokeWidth={2.25} />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive('heading', { level: 2 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            ariaLabel="Heading 2"
            title="Heading 2"
          >
            <Heading2 className="h-3.5 w-3.5" strokeWidth={2.25} />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive('bulletList')}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            ariaLabel="Bullet list"
            title="Bullet list"
          >
            <List className="h-3.5 w-3.5" strokeWidth={2.25} />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive('orderedList')}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            ariaLabel="Numbered list"
            title="Numbered list"
          >
            <ListOrdered className="h-3.5 w-3.5" strokeWidth={2.25} />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive('blockquote')}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            ariaLabel="Quote"
            title="Block quote"
          >
            <TextQuote className="h-3.5 w-3.5" strokeWidth={2.25} />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive('codeBlock')}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            ariaLabel="Code block"
            title="Code block"
          >
            <Braces className="h-3.5 w-3.5" strokeWidth={2.25} />
          </ToolbarButton>
          <div className="mx-1 h-4 w-px bg-border/70" />
          <ToolbarButton onClick={() => editor.chain().focus().undo().run()} ariaLabel="Undo" title="Undo">
            <Undo2 className="h-3.5 w-3.5" strokeWidth={2.25} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().redo().run()} ariaLabel="Redo" title="Redo">
            <Redo2 className="h-3.5 w-3.5" strokeWidth={2.25} />
          </ToolbarButton>
          {showPageBreak ? (
            <>
              <div className="mx-1 h-4 w-px bg-border/70" />
              <ToolbarButton
                onClick={() => editor.chain().focus().setHorizontalRule().run()}
                ariaLabel={pageBreakTitle}
                title={pageBreakTitle}
              >
                <SeparatorHorizontal className="h-3.5 w-3.5" strokeWidth={2.25} />
              </ToolbarButton>
            </>
          ) : null}
          {toolbarEnd ? (
            <>
              <div className="mx-1 h-4 w-px bg-border/70" />
              {toolbarEnd}
            </>
          ) : null}
        </div>
      </div>

      <BubbleMenu
        editor={editor}
        shouldShow={({ editor: ed, state }) =>
          ed.isEditable && !state.selection.empty && !ed.isActive('codeBlock')
        }
        options={{ placement: 'top' }}
        className="flex items-center gap-1 rounded-md border border-border bg-panel p-1 shadow-panel"
      >
        <BubbleButton
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
          ariaLabel="Bold"
          title="Bold"
        >
          <Bold className="h-3.5 w-3.5" strokeWidth={2.25} />
        </BubbleButton>
        <BubbleButton
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          ariaLabel="Italic"
          title="Italic"
        >
          <Italic className="h-3.5 w-3.5" strokeWidth={2.25} />
        </BubbleButton>
        <BubbleButton
          active={editor.isActive('code')}
          onClick={() => editor.chain().focus().toggleCode().run()}
          ariaLabel="Inline code"
          title="Inline code"
        >
          <Code2 className="h-3.5 w-3.5" strokeWidth={2.25} />
        </BubbleButton>
        <div className="mx-1 h-4 w-px bg-border/70" />
        <ColorSwatch color="var(--ink)" ariaLabel="Default text color" onClick={() => editor.chain().focus().unsetColor().run()} />
        <ColorSwatch color="#c4713f" ariaLabel="Accent text color" onClick={() => editor.chain().focus().setColor('#c4713f').run()} />
        <ColorSwatch color="#fca5a5" ariaLabel="Rose text color" onClick={() => editor.chain().focus().setColor('#fca5a5').run()} />
        <ColorSwatch color="#7fb9a7" ariaLabel="Mint text color" onClick={() => editor.chain().focus().setColor('#7fb9a7').run()} />
        <ColorSwatch color="#a7b6ff" ariaLabel="Periwinkle text color" onClick={() => editor.chain().focus().setColor('#a7b6ff').run()} />
      </BubbleMenu>

      <div
        // `min-h-0` is required for `flex-1` overflow to actually scroll
        // inside the column. `overscroll-contain` keeps scroll momentum
        // inside the editor instead of bleeding into the page.
        className={cn(
          'tiptap-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain rounded-md border border-border bg-surface px-5 py-4',
          showPageBreak && 'tiptap-page-break-hints'
        )}
        style={
          showPageBreak
            ? ({ '--page-break-label': `"${pageBreakDecorLabel}"` } as CSSProperties)
            : undefined
        }
        onClick={() => {
          // Clicking the padded gutter below content should still focus the
          // editor so the caret lands at the end — matches what users expect.
          if (!editor.isFocused) editor.commands.focus('end')
        }}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
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

function BubbleButton({
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
        active
          ? 'border-accent/50 bg-panel2 text-ink'
          : 'border-transparent bg-transparent text-muted hover:border-border/80 hover:bg-panel2/60 hover:text-ink'
      )}
    >
      {children}
    </button>
  )
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
      onClick={onClick}
      aria-label={ariaLabel}
      title={ariaLabel}
      className="flex h-7 w-7 items-center justify-center rounded-sm border border-border/70 bg-panel text-muted transition hover:border-accent/40 hover:text-ink"
    >
      <span className="h-3.5 w-3.5 rounded-full border border-border/70" style={{ backgroundColor: color }} />
    </button>
  )
}
