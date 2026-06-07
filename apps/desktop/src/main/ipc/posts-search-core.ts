import path from 'node:path'
import { readFile, stat } from 'node:fs/promises'
import {
  matchPostFields,
  plainTextFromMarkdown,
  snippetAroundMatch,
  type PostSearchHit,
  type PostSearchMatchField
} from '@emprint/shared'
import { safeListDirectory, summarizeMarkdown } from './core'

export interface PostsSearchInput {
  section: 'posts' | 'drafts'
  query: string
  tag?: string
}

let cacheKey = ''
let cacheResults: PostSearchHit[] = []

export function invalidatePostsSearchCache(): void {
  cacheKey = ''
  cacheResults = []
}

function buildCacheKey(workspaceRoot: string, input: PostsSearchInput): string {
  return `${workspaceRoot}\0${input.section}\0${input.query}\0${input.tag ?? ''}`
}

function defaultSnippet(description: string, bodyPlain: string, query: string): string {
  const desc = description.trim()
  if (desc) return desc.slice(0, 180)
  if (query.trim()) return snippetAroundMatch(bodyPlain, query)
  return bodyPlain.slice(0, 180)
}

export async function searchPosts(workspaceRoot: string, input: PostsSearchInput): Promise<PostSearchHit[]> {
  const query = input.query.trim()
  const tagFilter = input.tag?.trim()
  const key = buildCacheKey(workspaceRoot, { ...input, query, ...(tagFilter ? { tag: tagFilter } : {}) })
  if (key === cacheKey) return cacheResults

  const directory = path.join(workspaceRoot, input.section)
  const entries = await safeListDirectory(directory)
  const markdownFiles = entries.filter((entry) => entry.toLowerCase().endsWith('.md'))

  const hits: PostSearchHit[] = []

  for (const fileName of markdownFiles) {
    const relativePath = `${input.section}/${fileName}`
    const absolutePath = path.join(workspaceRoot, relativePath)
    const content = await readFile(absolutePath, 'utf8')
    const fileStat = await stat(absolutePath)
    const summary = summarizeMarkdown(relativePath, content, fileStat.mtime.toISOString())

    if (tagFilter && !summary.tags.includes(tagFilter)) continue

    const bodyPlain = plainTextFromMarkdown(content)
    let matchedIn: PostSearchMatchField[] = []

    if (query) {
      matchedIn = matchPostFields({
        query,
        title: summary.title,
        description: summary.description,
        tags: summary.tags,
        path: summary.path,
        bodyPlain
      })
      if (matchedIn.length === 0) continue
    }

    const snippet =
      query && matchedIn.includes('body')
        ? snippetAroundMatch(bodyPlain, query)
        : defaultSnippet(summary.description, bodyPlain, query)

    hits.push({
      path: summary.path,
      title: summary.title,
      description: summary.description,
      tags: summary.tags,
      updatedAt: summary.updatedAt,
      snippet,
      matchedIn
    })
  }

  hits.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
  cacheKey = key
  cacheResults = hits
  return hits
}
