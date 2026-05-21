export interface DocumentNode {
  body: string
  frontmatter: Record<string, unknown>
}

export interface DocumentAdapter {
  load(source: string): DocumentNode
  save(doc: DocumentNode): string
  exportMarkdown(doc: DocumentNode): string
  importMarkdown(markdown: string): DocumentNode
}
