import matter from 'gray-matter'
import {
  draftFlagFromRelativePath,
  type AppLocale,
  type PostSummary,
  type WorkspaceConfig
} from '@emprint/shared'

export interface StarterPostArtifact {
  relativePath: string
  content: string
  summary: PostSummary
}

export function createStarterPostArtifact(config: WorkspaceConfig): StarterPostArtifact {
  const date = new Date().toISOString().slice(0, 10)
  const slug = slugify(
    config.title || (config.locale === 'ko' ? '엠프린트-워크스페이스' : 'emprint-workspace')
  )
  const relativePath = `posts/${date}-${slug}.md`

  const body = STARTER_BODY[config.locale]
  const tags = STARTER_TAGS[config.locale]

  const content = [
    '---',
    `title: ${config.title}`,
    `description: ${config.description}`,
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
    summary: parsePostSummary(relativePath, content)
  }
}

export function parsePostSummary(relativePath: string, content: string): PostSummary {
  const { data } = matter(content)

  return {
    path: relativePath,
    title: asString(data.title, inferTitleFromPath(relativePath)),
    description: asString(data.description, ''),
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    draft: draftFlagFromRelativePath(relativePath),
    createdAt: asString(data.createdAt, ''),
    updatedAt: asString(data.updatedAt, '')
  }
}

export function createWorkspaceCacheReadme(locale: AppLocale): string {
  if (locale === 'ko') {
    return [
      '# Emprint 워크스페이스 캐시',
      '',
      '이 디렉터리는 런타임에서 파생된 데이터, 메타데이터, 앞으로 추가될 인덱스를 저장합니다.',
      '다른 위치의 마크다운 파일이 항상 실제 소스입니다.'
    ].join('\n')
  }

  return [
    '# Emprint Workspace Cache',
    '',
    'This directory stores derived runtime data, metadata, and future indexes.',
    'Markdown files elsewhere remain the source of truth.'
  ].join('\n')
}

const STARTER_TAGS: Record<AppLocale, string[]> = {
  ko: ['글쓰기', '엠프린트'],
  en: ['writing', 'emprint']
}

const STARTER_BODY: Record<AppLocale, string> = {
  ko: [
    '# Emprint에 오신 것을 환영합니다',
    '',
    '이 저장소는 당신의 작업을 담아 두는 로컬 워크스페이스입니다.',
    '',
    '이 폴더는 VSCode에서 바로 열 수 있고, 마크다운 파일을 직접 수정해도 괜찮습니다. 파일의 소유권은 언제나 사용자에게 있습니다.'
  ].join('\n'),
  en: [
    '# Welcome to Emprint',
    '',
    'This repository is a local workspace for preserving your work.',
    '',
    'You can open this folder directly in VSCode or edit the Markdown files yourself. The files always remain yours.'
  ].join('\n')
}

function inferTitleFromPath(relativePath: string): string {
  const inferredTitle = relativePath
    .split('/')
    .pop()
    ?.replace(/\.md$/, '')
    ?.replace(/^\d{4}-\d{2}-\d{2}-/, '')
    ?.replace(/-/g, ' ')

  return inferredTitle && inferredTitle.length > 0 ? inferredTitle : '제목 없음'
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
