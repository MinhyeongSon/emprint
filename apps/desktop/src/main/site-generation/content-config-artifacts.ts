import type { WorkspaceArtifact } from '@emprint/core'
import { getAnthologyContentLayout, type AnthologyKind } from '@emprint/shared'

/** Astro v5 content collection definition per anthology kind. */
export function createContentConfigArtifact(kind: AnthologyKind): WorkspaceArtifact {
  if (kind === 'dictionary') {
    return {
      relativePath: 'src/content.config.ts',
      content: `import { defineCollection, z } from 'astro:content'
import { glob } from 'astro/loaders'

const knowledge = defineCollection({
  loader: glob({ pattern: '*.md', base: './knowledge' }),
  schema: z.object({
    title: z.preprocess(
      (val) => (typeof val === 'string' && val.trim() ? val.trim() : 'Untitled'),
      z.string()
    ),
    description: z.string().optional().default(''),
    index: z.preprocess(
      (val) => (typeof val === 'string' ? val.trim() : ''),
      z.string()
    ),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    createdAt: z.coerce.date().optional(),
    updatedAt: z.coerce.date().optional()
  })
})

export const collections = { knowledge }
`
    }
  }

  if (kind === 'column') {
    return {
      relativePath: 'src/content.config.ts',
      content: `import { defineCollection, z } from 'astro:content'
import { glob } from 'astro/loaders'

const posts = defineCollection({
  loader: glob({ pattern: '*.md', base: './posts' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional().default(''),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    createdAt: z.coerce.date().optional(),
    updatedAt: z.coerce.date().optional()
  })
})

export const collections = { posts }
`
    }
  }

  if (kind === 'book') {
    const layout = getAnthologyContentLayout('book')
    return {
      relativePath: layout.contentConfigPath,
      content: `import { defineCollection, z } from 'astro:content'
import { glob } from 'astro/loaders'

const story = defineCollection({
  loader: glob({ pattern: '*.md', base: './story' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional().default(''),
    subtitle: z.string().optional(),
    author: z.string().optional()
  })
})

export const collections = { story }
`
    }
  }

  if (kind === 'fragments') {
    return {
      relativePath: 'src/content.config.ts',
      content: `/** Fragments uses config/artwork-manifest.json — no Astro markdown collections. */
export const collections = {}
`
    }
  }

  if (kind === 'memoir') {
    const layout = getAnthologyContentLayout('memoir')
    return {
    relativePath: layout.contentConfigPath,
    content: `import { defineCollection, z } from 'astro:content'
import { glob } from 'astro/loaders'

const sectionTypes = [
  'Hero',
  'Introduction',
  'Quote',
  'Project',
  'Skill',
  'Contact',
  'ProjectGroup',
  'SkillGroup',
  'Timeline',
  'Gallery'
] as const

const sections = defineCollection({
  loader: glob({ pattern: '*.json', base: './sections' }),
  schema: z.object({
    id: z.string(),
    type: z.enum(sectionTypes),
    order: z.number().default(0),
    published: z.boolean().default(true),
    children: z.array(z.string()).optional(),
    props: z.record(z.string(), z.any()).default({})
  })
})

export const collections = { sections }
`
    }
  }

  throw new Error(`Unsupported anthology kind: ${kind}`)
}
