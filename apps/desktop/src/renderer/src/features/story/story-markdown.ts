import { parseMarkdown, serializeMarkdown } from '@emprint/core'

export interface StoryFrontmatter {
  title: string
  description: string
  subtitle: string
  author: string
}

export function parseStory(content: string): { data: Record<string, unknown>; body: string } {
  return parseMarkdown(content)
}

export function buildStoryMarkdown(input: { data: Record<string, unknown>; body: string }): string {
  return serializeMarkdown({ data: input.data, body: input.body, dropEmptyStrings: true })
}

export function readStoryFrontmatter(data: Record<string, unknown>): StoryFrontmatter {
  return {
    title: typeof data.title === 'string' ? data.title : '',
    description: typeof data.description === 'string' ? data.description : '',
    subtitle: typeof data.subtitle === 'string' ? data.subtitle : '',
    author: typeof data.author === 'string' ? data.author : ''
  }
}

export function storyFrontmatterFromEditor(input: {
  existing: Record<string, unknown>
  title: string
  description: string
  subtitle: string
  author: string
}): Record<string, unknown> {
  return {
    ...input.existing,
    title: input.title.trim() || input.existing.title,
    description: input.description.trim() || input.existing.description,
    subtitle: input.subtitle.trim() || input.existing.subtitle,
    author: input.author.trim() || input.existing.author
  }
}

export function countStoryStats(markdownBody: string): { words: number; characters: number } {
  const plain = markdownBody
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]+`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
    .replace(/\[[^\]]*\]\([^)]+\)/g, ' ')
    .replace(/[#>*_~\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const characters = plain.length
  const words = plain ? plain.split(' ').filter(Boolean).length : 0
  return { words, characters }
}
