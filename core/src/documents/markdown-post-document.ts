import type { DocumentAdapter, DocumentNode } from './types'
import { parseMarkdown, serializeMarkdown } from './markdown-frontmatter'

/** Editor-agnostic markdown + YAML frontmatter adapter for Column posts. */
export class MarkdownPostDocumentAdapter implements DocumentAdapter {
  load(source: string): DocumentNode {
    const parsed = parseMarkdown(source)
    return {
      body: parsed.body,
      frontmatter: parsed.data
    }
  }

  save(doc: DocumentNode): string {
    return serializeMarkdown({ data: doc.frontmatter, body: doc.body })
  }

  exportMarkdown(doc: DocumentNode): string {
    return this.save(doc)
  }

  importMarkdown(markdown: string): DocumentNode {
    return this.load(markdown)
  }
}

export const markdownPostDocument = new MarkdownPostDocumentAdapter()
