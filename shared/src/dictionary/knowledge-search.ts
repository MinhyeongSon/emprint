/** Dictionary knowledge search helpers — plain-text body match + snippets. */

import { plainTextFromMarkdown, snippetAroundMatch } from '../column/post-search'

export type KnowledgeSearchMatchField =
  | 'title'
  | 'description'
  | 'tags'
  | 'path'
  | 'index'
  | 'body'

export function matchKnowledgeFields(input: {
  query: string
  title: string
  description: string
  tags: string[]
  path: string
  index: string
  bodyPlain: string
}): KnowledgeSearchMatchField[] {
  const q = input.query.trim().toLowerCase()
  if (!q) return []

  const matched: KnowledgeSearchMatchField[] = []
  if (input.title.toLowerCase().includes(q)) matched.push('title')
  if (input.description.toLowerCase().includes(q)) matched.push('description')
  if (input.path.toLowerCase().includes(q)) matched.push('path')
  if (input.index.toLowerCase().includes(q)) matched.push('index')
  if (input.tags.some((t) => t.toLowerCase().includes(q))) matched.push('tags')
  if (input.bodyPlain.toLowerCase().includes(q)) matched.push('body')
  return matched
}

export { plainTextFromMarkdown, snippetAroundMatch }
