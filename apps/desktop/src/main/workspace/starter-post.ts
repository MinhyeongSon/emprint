import matter from 'gray-matter'
import type { AppLocale, PostSummary, WorkspaceConfig } from '@emprint/shared'

/**
 * Starter post creation lives next to the bootstrapper because it is the only
 * piece of "first markdown" content emprint emits. The body/tags vary by
 * `siteProjectKind` so a new blog workspace gets a writing-oriented intro and
 * a portfolio workspace gets a case-study intro.
 */
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

  const variant = config.siteProjectKind === 'showcase' ? 'portfolio' : 'minimal'
  const body = STARTER_BODY[config.locale][variant]
  const tags = STARTER_TAGS[config.locale][variant]

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
    draft: Boolean(data.draft),
    createdAt: asString(data.createdAt, ''),
    updatedAt: asString(data.updatedAt, '')
  }
}

type StarterVariant = 'minimal' | 'portfolio'

const STARTER_TAGS: Record<AppLocale, Record<StarterVariant, string[]>> = {
  ko: {
    minimal: ['글쓰기', '엠프린트'],
    portfolio: ['포트폴리오', '엠프린트']
  },
  en: {
    minimal: ['writing', 'emprint'],
    portfolio: ['portfolio', 'emprint']
  }
}

const STARTER_BODY: Record<AppLocale, Record<StarterVariant, string>> = {
  ko: {
    minimal: [
      '# Emprint에 오신 것을 환영합니다',
      '',
      '이 저장소는 당신의 작업을 담아 두는 로컬 워크스페이스입니다.',
      '',
      '이 폴더는 VSCode에서 바로 열 수 있고, 마크다운 파일을 직접 수정해도 괜찮습니다. 파일의 소유권은 언제나 사용자에게 있습니다.'
    ].join('\n'),
    portfolio: [
      '# 첫 번째 케이스 스터디',
      '',
      '이 워크스페이스는 프로젝트 결과물과 작업 과정을 함께 보존하기 위한 구조입니다.',
      '',
      '## 추천 구성',
      '',
      '- 문제',
      '- 접근 방식',
      '- 결과',
      '- 회고',
      '',
      '모든 포스트는 마크다운으로 남기 때문에 Emprint 밖에서도 계속 이어서 사용할 수 있습니다.'
    ].join('\n')
  },
  en: {
    minimal: [
      '# Welcome to Emprint',
      '',
      'This repository is a local workspace for preserving your work.',
      '',
      'You can open this folder directly in VSCode or edit the Markdown files yourself. The files always remain yours.'
    ].join('\n'),
    portfolio: [
      '# First Case Study',
      '',
      'This workspace is meant to preserve both project outcomes and the path that led to them.',
      '',
      '## Suggested structure',
      '',
      '- Problem',
      '- Approach',
      '- Outcome',
      '- Reflection',
      '',
      'Every post stays in Markdown so the work remains portable outside Emprint.'
    ].join('\n')
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
