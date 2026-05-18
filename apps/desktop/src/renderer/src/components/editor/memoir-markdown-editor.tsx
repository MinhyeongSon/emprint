import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { List, ListOrdered, Redo2, Undo2 } from 'lucide-react'
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
  className
}: MemoirMarkdownEditorProps) {
  const editorRef = useRef<Editor | null>(null)

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
      </div>

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
