/**
 * Memoir semantic section model — structured composition, not a page builder.
 */

/** Leaf sections — must not contain child sections. */
export const MEMOIR_LEAF_SECTION_TYPES = [
  'Hero',
  'Introduction',
  'Quote',
  'Project',
  'Skill',
  'Contact'
] as const

/** Container sections — may list child section ids in `children`. */
export const MEMOIR_CONTAINER_SECTION_TYPES = [
  'ProjectGroup',
  'SkillGroup',
  'Timeline',
  'Gallery'
] as const

export const MEMOIR_SECTION_TYPES = [
  ...MEMOIR_CONTAINER_SECTION_TYPES,
  ...MEMOIR_LEAF_SECTION_TYPES
] as const

export type MemoirLeafSectionType = (typeof MEMOIR_LEAF_SECTION_TYPES)[number]
export type MemoirContainerSectionType = (typeof MEMOIR_CONTAINER_SECTION_TYPES)[number]
export type MemoirSectionType = (typeof MEMOIR_SECTION_TYPES)[number]

const leafSet = new Set<string>(MEMOIR_LEAF_SECTION_TYPES)
const containerSet = new Set<string>(MEMOIR_CONTAINER_SECTION_TYPES)
const allTypes = new Set<string>(MEMOIR_SECTION_TYPES)

export function isMemoirSectionType(value: string): value is MemoirSectionType {
  return allTypes.has(value)
}

export function isMemoirContainerSectionType(type: MemoirSectionType): type is MemoirContainerSectionType {
  return containerSet.has(type)
}

export function isMemoirLeafSectionType(type: MemoirSectionType): type is MemoirLeafSectionType {
  return leafSet.has(type)
}

/** On-disk section file under `sections/{id}.json`. */
export interface MemoirSectionFile {
  id: string
  type: MemoirSectionType
  /** Sort key among siblings (same parent / root). */
  order: number
  published: boolean
  /** Container sections only — ordered child section ids. */
  children?: string[]
  props: Record<string, unknown>
}

export interface MemoirSectionSummary {
  path: string
  id: string
  type: MemoirSectionType
  order: number
  published: boolean
  title: string
  /** Set when this section is listed under a container's `children`. */
  parentId?: string
  /** Container sections only — ordered child ids. */
  childIds?: string[]
}

export function memoirSectionRelativePath(id: string): string {
  const safe = id.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'section'
  return `sections/${safe}.json`
}

export function sectionTitleFromProps(type: MemoirSectionType, props: Record<string, unknown>): string {
  const headline =
    (typeof props.title === 'string' && props.title) ||
    (typeof props.name === 'string' && props.name) ||
    (typeof props.heading === 'string' && props.heading)
  if (headline) return headline
  return type
}

export function parseMemoirSectionFile(raw: string, relativePath: string): MemoirSectionFile {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error(`Invalid JSON in ${relativePath}.`)
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`Section file must be a JSON object: ${relativePath}.`)
  }
  const record = parsed as Record<string, unknown>
  const id = typeof record.id === 'string' ? record.id.trim() : ''
  const typeRaw = typeof record.type === 'string' ? record.type.trim() : ''
  if (!id) throw new Error(`Section id is required: ${relativePath}.`)
  if (!isMemoirSectionType(typeRaw)) {
    throw new Error(`Unknown section type "${typeRaw}" in ${relativePath}.`)
  }
  const order = typeof record.order === 'number' && Number.isFinite(record.order) ? record.order : 0
  const published = record.published !== false
  const props =
    record.props && typeof record.props === 'object' && !Array.isArray(record.props)
      ? (record.props as Record<string, unknown>)
      : {}

  let children: string[] | undefined
  if (record.children !== undefined) {
    if (!isMemoirContainerSectionType(typeRaw)) {
      throw new Error(`Only container sections may define children: ${relativePath}.`)
    }
    if (!Array.isArray(record.children)) {
      throw new Error(`children must be an array of section ids: ${relativePath}.`)
    }
    children = record.children.map((c) => String(c))
  } else if (isMemoirLeafSectionType(typeRaw) && record.children) {
    throw new Error(`Leaf sections cannot contain children: ${relativePath}.`)
  }

  return { id, type: typeRaw, order, published, ...(children ? { children } : {}), props }
}

export function validateMemoirSectionTree(sections: MemoirSectionFile[]): void {
  const byId = new Map(sections.map((s) => [s.id, s]))
  for (const section of sections) {
    if (section.children) {
      if (!isMemoirContainerSectionType(section.type)) {
        throw new Error(`Section "${section.id}" is not a container but defines children.`)
      }
      for (const childId of section.children) {
        if (!byId.has(childId)) {
          throw new Error(`Section "${section.id}" references missing child "${childId}".`)
        }
        const child = byId.get(childId)!
        if (child.children?.length) {
          throw new Error(`Nested containers are not supported (child "${childId}" has children).`)
        }
      }
    }
  }
}
