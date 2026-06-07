import {
  sectionTitleFromProps,
  type MemoirContainerSectionType,
  type MemoirLeafSectionType,
  type MemoirSectionFile,
  type MemoirSectionSummary,
  type MemoirSectionType,
  MEMOIR_CONTAINER_SECTION_TYPES,
  MEMOIR_LEAF_SECTION_TYPES,
  MEMOIR_SECTION_TYPES
} from './sections'
import {
  isValidMemoirAssetPath,
  isValidMemoirExternalUrl,
  parseMemoirContactLinks,
  serializeMemoirContactLinks
} from './section-props'

export type MemoirFieldKind = 'text' | 'textarea' | 'markdown' | 'asset' | 'url'

export interface MemoirSectionFieldDef {
  key: string
  kind: MemoirFieldKind
  required?: boolean
  labelEn: string
  labelKo: string
  placeholderEn?: string
  placeholderKo?: string
}

export const MEMOIR_SECTION_FIELD_DEFS: Record<MemoirSectionType, MemoirSectionFieldDef[]> = {
  Hero: [
    { key: 'eyebrow', kind: 'text', labelEn: 'Eyebrow', labelKo: '상단 라벨' },
    { key: 'title', kind: 'text', required: true, labelEn: 'Title', labelKo: '제목' },
    { key: 'subtitle', kind: 'text', labelEn: 'Subtitle', labelKo: '부제' },
    {
      key: 'image',
      kind: 'asset',
      labelEn: 'Portrait or hero image',
      labelKo: '프로필·히어로 이미지'
    }
  ],
  Introduction: [
    { key: 'title', kind: 'text', labelEn: 'Title', labelKo: '제목' },
    {
      key: 'period',
      kind: 'text',
      labelEn: 'Date or period',
      labelKo: '날짜 또는 기간',
      placeholderEn: 'e.g. 2022–2024',
      placeholderKo: '예: 2022–2024'
    },
    {
      key: 'body',
      kind: 'markdown',
      required: true,
      labelEn: 'Body',
      labelKo: '본문',
      placeholderEn: 'Write your introduction…',
      placeholderKo: '소개 본문을 입력하세요…'
    }
  ],
  Quote: [
    {
      key: 'body',
      kind: 'markdown',
      required: true,
      labelEn: 'Quote',
      labelKo: '인용문',
      placeholderEn: 'The quote text…',
      placeholderKo: '인용문을 입력하세요…'
    },
    { key: 'attribution', kind: 'text', labelEn: 'Attribution', labelKo: '출처' }
  ],
  Project: [
    { key: 'title', kind: 'text', required: true, labelEn: 'Title', labelKo: '제목' },
    { key: 'image', kind: 'asset', labelEn: 'Cover image', labelKo: '대표 이미지' },
    {
      key: 'link',
      kind: 'url',
      labelEn: 'Project link',
      labelKo: '프로젝트 링크',
      placeholderEn: 'https://…',
      placeholderKo: 'https://…'
    },
    {
      key: 'period',
      kind: 'text',
      labelEn: 'Date or period',
      labelKo: '날짜 또는 기간',
      placeholderEn: 'e.g. 2023',
      placeholderKo: '예: 2023'
    },
    { key: 'role', kind: 'text', labelEn: 'Role', labelKo: '역할', placeholderEn: 'e.g. Lead designer', placeholderKo: '예: 리드 디자이너' },
    {
      key: 'body',
      kind: 'markdown',
      labelEn: 'Description',
      labelKo: '설명',
      placeholderEn: 'What you built and why it matters…',
      placeholderKo: '프로젝트 설명을 입력하세요…'
    }
  ],
  Skill: [
    { key: 'name', kind: 'text', required: true, labelEn: 'Name', labelKo: '이름' },
    { key: 'level', kind: 'text', labelEn: 'Level', labelKo: '수준', placeholderEn: 'e.g. Advanced', placeholderKo: '예: 숙련' }
  ],
  Contact: [
    { key: 'title', kind: 'text', labelEn: 'Title', labelKo: '제목' },
    {
      key: 'body',
      kind: 'markdown',
      labelEn: 'Body',
      labelKo: '본문',
      placeholderEn: 'Email, links, or a short note…',
      placeholderKo: '이메일, 링크, 또는 짧은 안내…'
    }
  ],
  ProjectGroup: [{ key: 'title', kind: 'text', labelEn: 'Group title', labelKo: '그룹 제목' }],
  SkillGroup: [{ key: 'title', kind: 'text', labelEn: 'Group title', labelKo: '그룹 제목' }],
  Timeline: [{ key: 'title', kind: 'text', labelEn: 'Timeline title', labelKo: '타임라인 제목' }],
  Gallery: [{ key: 'title', kind: 'text', labelEn: 'Gallery title', labelKo: '갤러리 제목' }]
}

const containerChildTypes: Record<MemoirContainerSectionType, MemoirLeafSectionType[]> = {
  ProjectGroup: ['Project'],
  SkillGroup: ['Skill'],
  Timeline: ['Introduction', 'Quote', 'Project', 'Skill', 'Contact'],
  Gallery: ['Project', 'Introduction']
}

export function memoirChildLeafTypesForContainer(
  type: MemoirContainerSectionType
): MemoirLeafSectionType[] {
  return containerChildTypes[type]
}

export function defaultPropsForMemoirSectionType(type: MemoirSectionType): Record<string, unknown> {
  const defs = MEMOIR_SECTION_FIELD_DEFS[type]
  const props: Record<string, unknown> = {}
  for (const field of defs) {
    if (field.kind === 'textarea' || field.kind === 'markdown') {
      props[field.key] = ''
    } else {
      props[field.key] = ''
    }
  }
  if (type === 'Hero') {
    props.title = 'Title'
  }
  if (type === 'Project') {
    props.title = 'New project'
  }
  if (type === 'Skill') {
    props.name = 'Skill'
  }
  return props
}

export function slugifyMemoirSectionId(input: string): string {
  const slug = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'section'
}

export function uniqueMemoirSectionId(baseId: string, existingIds: Iterable<string>): string {
  const taken = new Set(existingIds)
  const slug = slugifyMemoirSectionId(baseId) || 'section'
  if (!taken.has(slug)) return slug
  for (let n = 2; n < 10_000; n++) {
    const candidate = `${slug}-${n}`
    if (!taken.has(candidate)) return candidate
  }
  return `${slug}-${Date.now()}`
}

export function serializeMemoirSectionFile(section: MemoirSectionFile): string {
  const payload: Record<string, unknown> = {
    id: section.id,
    type: section.type,
    order: section.order,
    published: section.published,
    props: section.props
  }
  if (section.children?.length) {
    payload.children = section.children
  }
  return `${JSON.stringify(payload, null, 2)}\n`
}

export function enrichMemoirSectionsFromFiles(
  sections: MemoirSectionFile[],
  pathById: Map<string, string>
): MemoirSectionSummary[] {
  const parentByChild = new Map<string, string>()
  const childIdsByParent = new Map<string, string[]>()

  for (const section of sections) {
    if (section.children?.length) {
      childIdsByParent.set(section.id, [...section.children])
      for (const childId of section.children) {
        parentByChild.set(childId, section.id)
      }
    }
  }

  return sections
    .map((section) => {
      const parentId = parentByChild.get(section.id)
      const childIds = childIdsByParent.get(section.id)
      return {
        path: pathById.get(section.id) ?? `sections/${section.id}.json`,
        id: section.id,
        type: section.type,
        order: section.order,
        published: section.published,
        title: sectionTitleFromProps(section.type, section.props),
        ...(parentId ? { parentId } : {}),
        ...(childIds?.length ? { childIds } : {})
      } satisfies MemoirSectionSummary
    })
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
}

export function nextMemoirSectionOrder(
  sections: MemoirSectionFile[],
  parentId?: string
): number {
  if (!parentId) {
    const roots = sections.filter((s) => !sections.some((p) => p.children?.includes(s.id)))
    if (roots.length === 0) return sections.length
    return Math.max(...roots.map((s) => s.order), -1) + 1
  }
  const parent = sections.find((s) => s.id === parentId)
  if (!parent?.children?.length) return 0
  const children = parent.children
    .map((id) => sections.find((s) => s.id === id))
    .filter((s): s is MemoirSectionFile => Boolean(s))
  if (children.length === 0) return 0
  return Math.max(...children.map((s) => s.order), -1) + 1
}

export function validateMemoirSectionProps(type: MemoirSectionType, props: Record<string, unknown>): void {
  const defs = MEMOIR_SECTION_FIELD_DEFS[type]
  for (const field of defs) {
    if (!field.required) continue
    const value = props[field.key]
    if (typeof value !== 'string' || !value.trim()) {
      throw new Error(`"${field.labelEn}" is required for ${type} sections.`)
    }
  }

  for (const field of defs) {
    if (field.kind === 'asset') {
      const value = props[field.key]
      if (typeof value === 'string' && value.trim() && !isValidMemoirAssetPath(value)) {
        throw new Error(
          `"${field.labelEn}" must be a workspace image path (assets/images/…). Pick an image from Assets.`
        )
      }
    }
    if (field.kind === 'url') {
      const value = props[field.key]
      if (typeof value === 'string' && value.trim() && !isValidMemoirExternalUrl(value)) {
        throw new Error(`"${field.labelEn}" must be a valid http(s) or mailto: URL.`)
      }
    }
  }

  if (type === 'Contact') {
    const links = serializeMemoirContactLinks(parseMemoirContactLinks(props))
    const body = typeof props.body === 'string' ? props.body.trim() : ''
    if (!body && links.length === 0) {
      throw new Error('Contact sections need body text or at least one link.')
    }
    for (const link of links) {
      if (!link.label.trim()) {
        throw new Error('Each contact link needs a label.')
      }
      if (!isValidMemoirExternalUrl(link.url)) {
        throw new Error(`Contact link "${link.label}" must be a valid http(s) or mailto: URL.`)
      }
    }
  }
}

export { MEMOIR_SECTION_TYPES, MEMOIR_CONTAINER_SECTION_TYPES, MEMOIR_LEAF_SECTION_TYPES }
