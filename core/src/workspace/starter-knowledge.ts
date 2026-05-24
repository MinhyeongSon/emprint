import matter from 'gray-matter'
import {
  draftFlagFromRelativePath,
  normalizeIndexPath,
  type AppLocale,
  type KnowledgeSummary,
  type WorkspaceConfig
} from '@emprint/shared'

export interface StarterKnowledgeArtifact {
  relativePath: string
  content: string
  summary: KnowledgeSummary
}

export function createStarterKnowledgeArtifact(config: WorkspaceConfig): StarterKnowledgeArtifact {
  const date = new Date().toISOString().slice(0, 10)
  const slug = slugify(
    config.title || (config.locale === 'ko' ? '엠프린트-사전' : 'emprint-dictionary')
  )
  const relativePath = `knowledge/${date}-${slug}.md`
  const indexPath = config.locale === 'ko' ? '시작하기' : 'Getting started'

  const body = STARTER_BODY[config.locale]
  const tags = STARTER_TAGS[config.locale]

  const content = [
    '---',
    `title: ${config.title}`,
    `description: ${config.description}`,
    `index: ${indexPath}`,
    'tags:',
    ...tags.map((tag) => `  - ${tag}`),
    `createdAt: ${date}`,
    `updatedAt: ${date}`,
    'draft: false',
    '---',
    '',
    body
  ].join('\n')

  return {
    relativePath,
    content,
    summary: parseKnowledgeSummary(relativePath, content)
  }
}

export function parseKnowledgeSummary(relativePath: string, content: string): KnowledgeSummary {
  const { data } = matter(content)

  return {
    path: relativePath,
    title: asString(data.title, inferTitleFromPath(relativePath)),
    description: asString(data.description, ''),
    index: normalizeIndexPath(asString(data.index, '')),
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    draft: draftFlagFromRelativePath(relativePath, 'dictionary'),
    createdAt: asString(data.createdAt, ''),
    updatedAt: asString(data.updatedAt, '')
  }
}

const STARTER_TAGS: Record<AppLocale, string[]> = {
  ko: ['지식', '엠프린트'],
  en: ['knowledge', 'emprint']
}

const STARTER_BODY: Record<AppLocale, string> = {
  ko: [
    '# Dictionary에 오신 것을 환영합니다',
    '',
    '이 워크스페이스는 개념과 정의를 쌓아 가는 **지식 베이스**입니다.',
    '',
    '각 항목에는 **인덱스** 경로가 붙습니다. 예: `시작하기`, `과학/물리학`.',
    '',
    '마크다운 파일은 VSCode에서 직접 편집해도 됩니다.'
  ].join('\n'),
  en: [
    '# Welcome to Dictionary',
    '',
    'This workspace is a **knowledge base** for concepts and definitions.',
    '',
    'Each entry carries an **index** path — for example `Getting started` or `Science/Physics`.',
    '',
    'You can edit the markdown files directly in VSCode.'
  ].join('\n')
}

function inferTitleFromPath(relativePath: string): string {
  const inferredTitle = relativePath
    .split('/')
    .pop()
    ?.replace(/\.md$/, '')
    ?.replace(/^\d{4}-\d{2}-\d{2}-/, '')
    ?.replace(/-/g, ' ')

  return inferredTitle && inferredTitle.length > 0 ? inferredTitle : 'Untitled'
}

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback
}

function slugify(value: string): string {
  return (
    value
      .normalize('NFKC')
      .trim()
      .toLowerCase()
      .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
      .replace(/^-+|-+$/g, '') || 'workspace'
  )
}
