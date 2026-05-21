import matter from 'gray-matter'
import type { DocumentAdapter, DocumentNode } from './types'

/** Editor-agnostic markdown + YAML frontmatter adapter for Column posts. */
export class MarkdownPostDocumentAdapter implements DocumentAdapter {
  load(source: string): DocumentNode {
    const parsed = matter(source)
    const data = parsed.data
    const frontmatter =
      data && typeof data === 'object' && !Array.isArray(data)
        ? (data as Record<string, unknown>)
        : {}
    return {
      body: parsed.content,
      frontmatter
    }
  }

  save(doc: DocumentNode): string {
    return matter.stringify(doc.body, doc.frontmatter)
  }

  exportMarkdown(doc: DocumentNode): string {
    return this.save(doc)
  }

  importMarkdown(markdown: string): DocumentNode {
    return this.load(markdown)
  }
}

export const markdownPostDocument = new MarkdownPostDocumentAdapter()
