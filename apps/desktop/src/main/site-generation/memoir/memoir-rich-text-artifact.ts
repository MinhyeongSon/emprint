import type { WorkspaceArtifact } from '@emprint/core'
import memoirRichTextLibSource from '@emprint/shared/memoir/rich-text.ts?raw'

export function createMemoirRichTextArtifacts(): WorkspaceArtifact[] {
  const libSource = memoirRichTextLibSource

  return [
    {
      relativePath: 'src/lib/memoir-rich-text.ts',
      content: libSource
    },
    {
      relativePath: 'src/components/MemoirRichText.astro',
      content: memoirRichTextAstro()
    }
  ]
}

function memoirRichTextAstro(): string {
  return `---
import { renderMemoirRichText } from '../lib/memoir-rich-text'

interface Props {
  text: string
  class?: string
  as?: 'div' | 'blockquote'
}

const { text, class: extraClass, as = 'div' } = Astro.props
const html = renderMemoirRichText(String(text ?? ''))
const classes = ['ep-memoir-RichText', extraClass].filter(Boolean)
---

{html ? (
  as === 'blockquote' ? (
    <blockquote class:list={classes} set:html={html} />
  ) : (
    <div class:list={classes} set:html={html} />
  )
) : null}
`
}
