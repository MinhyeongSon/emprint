import path from 'node:path'
import { mkdir, readdir, readFile, unlink, writeFile } from 'node:fs/promises'
import {
  enrichMemoirSectionsFromFiles,
  isMemoirContainerSectionType,
  isMemoirLeafSectionType,
  memoirChildLeafTypesForContainer,
  memoirSectionRelativePath,
  nextMemoirSectionOrder,
  parseMemoirSectionFile,
  sectionTitleFromProps,
  parseMemoirContactLinksEditor,
  serializeMemoirContactLinks,
  serializeMemoirSectionFile,
  uniqueMemoirSectionId,
  validateMemoirSectionProps,
  validateMemoirSectionTree,
  type MemoirContainerSectionType,
  type MemoirLeafSectionType,
  type MemoirSectionFile,
  type MemoirSectionSummary
} from '@emprint/shared'
import { WORKSPACE_DIR } from '@emprint/shared'

async function listJsonFiles(directory: string): Promise<string[]> {
  try {
    const entries = await readdir(directory, { withFileTypes: true })
    return entries.filter((e) => e.isFile()).map((e) => e.name)
  } catch {
    return []
  }
}

export async function loadAllMemoirSectionFiles(
  workspaceRoot: string
): Promise<{ sections: MemoirSectionFile[]; pathById: Map<string, string> }> {
  const directory = path.join(workspaceRoot, WORKSPACE_DIR.sections)
  const entries = await listJsonFiles(directory)
  const jsonFiles = entries.filter((entry) => entry.toLowerCase().endsWith('.json'))
  const sections: MemoirSectionFile[] = []
  const pathById = new Map<string, string>()

  for (const fileName of jsonFiles) {
    const relativePath = `${WORKSPACE_DIR.sections}/${fileName}`
    const absolutePath = path.join(workspaceRoot, relativePath)
    const content = await readFile(absolutePath, 'utf8')
    const section = parseMemoirSectionFile(content, relativePath)
    sections.push(section)
    pathById.set(section.id, relativePath)
  }

  return { sections, pathById }
}

export async function listMemoirSectionSummaries(
  workspaceRoot: string
): Promise<MemoirSectionSummary[]> {
  const { sections, pathById } = await loadAllMemoirSectionFiles(workspaceRoot)
  return enrichMemoirSectionsFromFiles(sections, pathById)
}

function normalizeMemoirSectionForSave(section: MemoirSectionFile): MemoirSectionFile {
  if (section.type !== 'Contact') return section
  const links = serializeMemoirContactLinks(parseMemoirContactLinksEditor(section.props))
  const props = { ...section.props }
  if (links.length > 0) {
    props.links = links
  } else {
    delete props.links
  }
  return { ...section, props }
}

export async function writeMemoirSectionFile(
  workspaceRoot: string,
  section: MemoirSectionFile,
  options?: { previousPath?: string }
): Promise<{ path: string; section: MemoirSectionFile }> {
  section = normalizeMemoirSectionForSave(section)
  validateMemoirSectionProps(section.type, section.props)
  const relativePath = memoirSectionRelativePath(section.id)
  const abs = path.join(workspaceRoot, relativePath)

  const { sections, pathById } = await loadAllMemoirSectionFiles(workspaceRoot)
  const others = sections.filter((s) => s.id !== section.id)
  const merged = [...others, section]
  validateMemoirSectionTree(merged)

  await mkdir(path.dirname(abs), { recursive: true })
  await writeFile(abs, serializeMemoirSectionFile(section), 'utf8')

  if (section.children?.length) {
    await syncChildOrdersFromParent(workspaceRoot, section)
  } else {
    await syncChildOrderInParent(workspaceRoot, section)
  }

  if (options?.previousPath && options.previousPath !== relativePath) {
    const prevAbs = path.join(workspaceRoot, options.previousPath)
    if (prevAbs !== abs) {
      await unlink(prevAbs).catch(() => undefined)
    }
    pathById.delete(section.id)
  }

  return { path: relativePath.replace(/\\/g, '/'), section }
}

export async function createMemoirSectionFile(
  workspaceRoot: string,
  section: MemoirSectionFile,
  options?: { parentId?: string }
): Promise<{ path: string; section: MemoirSectionFile }> {
  const relativePath = memoirSectionRelativePath(section.id)
  const abs = path.join(workspaceRoot, relativePath)
  try {
    await readFile(abs, 'utf8')
    throw new Error(`A section with id "${section.id}" already exists.`)
  } catch (e) {
    if (e instanceof Error && e.message.includes('already exists')) throw e
    // file missing — ok
  }

  validateMemoirSectionProps(section.type, section.props)
  const { sections } = await loadAllMemoirSectionFiles(workspaceRoot)
  let fileSection: MemoirSectionFile = { ...section }

  if (options?.parentId) {
    const parent = sections.find((s) => s.id === options.parentId)
    if (!parent) {
      throw new Error(`Parent section "${options.parentId}" not found.`)
    }
    if (!isMemoirContainerSectionType(parent.type)) {
      throw new Error(`Section "${parent.id}" is not a container.`)
    }
    if (!isMemoirLeafSectionType(fileSection.type)) {
      throw new Error('Only leaf sections can be added to a container.')
    }
    const allowed = memoirChildLeafTypesForContainer(parent.type as MemoirContainerSectionType)
    if (!allowed.includes(fileSection.type as MemoirLeafSectionType)) {
      throw new Error(`Section type "${fileSection.type}" cannot be added to ${parent.type}.`)
    }
    for (const other of sections) {
      if (other.children?.includes(fileSection.id)) {
        throw new Error(`Section id "${fileSection.id}" is already referenced as a child.`)
      }
    }
    fileSection = {
      ...fileSection,
      order: nextMemoirSectionOrder(sections, options.parentId)
    }
    const children = [...(parent.children ?? []), fileSection.id]
    const updatedParent: MemoirSectionFile = { ...parent, children }
    const merged = [
      ...sections.filter((s) => s.id !== parent.id && s.id !== fileSection.id),
      fileSection,
      updatedParent
    ]
    validateMemoirSectionTree(merged)
    await mkdir(path.dirname(abs), { recursive: true })
    await writeFile(abs, serializeMemoirSectionFile(fileSection), 'utf8')
    const parentRel = memoirSectionRelativePath(parent.id)
    await writeFile(
      path.join(workspaceRoot, parentRel),
      serializeMemoirSectionFile(updatedParent),
      'utf8'
    )
    await syncChildOrdersFromParent(workspaceRoot, updatedParent)
    return { path: relativePath.replace(/\\/g, '/'), section: fileSection }
  }

  return writeMemoirSectionFile(workspaceRoot, fileSection)
}

async function syncChildOrdersFromParent(
  workspaceRoot: string,
  parent: MemoirSectionFile
): Promise<void> {
  if (!parent.children?.length) return
  const { sections, pathById } = await loadAllMemoirSectionFiles(workspaceRoot)
  for (let index = 0; index < parent.children.length; index++) {
    const childId = parent.children[index]
    if (!childId) continue
    const child = sections.find((s) => s.id === childId)
    if (!child || child.order === index) continue
    const rel = pathById.get(childId) ?? memoirSectionRelativePath(childId)
    await writeFile(
      path.join(workspaceRoot, rel),
      serializeMemoirSectionFile({ ...child, order: index }),
      'utf8'
    )
  }
}

async function syncChildOrderInParent(
  workspaceRoot: string,
  child: MemoirSectionFile
): Promise<void> {
  const { sections } = await loadAllMemoirSectionFiles(workspaceRoot)
  const parent = sections.find((s) => s.children?.includes(child.id))
  if (!parent?.children?.length) return
  const currentIndex = parent.children.indexOf(child.id)
  if (currentIndex < 0) return
  const targetIndex = Math.max(0, Math.min(Math.floor(child.order), parent.children.length - 1))
  if (currentIndex === targetIndex) {
    if (child.order !== targetIndex) {
      const rel = memoirSectionRelativePath(child.id)
      await writeFile(
        path.join(workspaceRoot, rel),
        serializeMemoirSectionFile({ ...child, order: targetIndex }),
        'utf8'
      )
    }
    return
  }
  const children = [...parent.children]
  children.splice(currentIndex, 1)
  children.splice(targetIndex, 0, child.id)
  const updatedParent: MemoirSectionFile = { ...parent, children }
  const parentRel = memoirSectionRelativePath(parent.id)
  await writeFile(
    path.join(workspaceRoot, parentRel),
    serializeMemoirSectionFile(updatedParent),
    'utf8'
  )
  await syncChildOrdersFromParent(workspaceRoot, updatedParent)
}

export async function deleteMemoirSectionWithCleanup(
  workspaceRoot: string,
  inputPath: string
): Promise<{ path: string }> {
  const abs = path.join(workspaceRoot, inputPath)
  const content = await readFile(abs, 'utf8')
  const target = parseMemoirSectionFile(content, inputPath)

  const { sections } = await loadAllMemoirSectionFiles(workspaceRoot)
  const remaining: MemoirSectionFile[] = []

  for (const section of sections) {
    if (section.id === target.id) continue
    if (section.children?.includes(target.id)) {
      const children = section.children.filter((id) => id !== target.id)
      const { children: _drop, ...rest } = section
      remaining.push(children.length ? { ...rest, children } : rest)
    } else {
      remaining.push(section)
    }
  }

  validateMemoirSectionTree(remaining)
  await unlink(abs)

  for (const section of remaining) {
    const before = sections.find((s) => s.id === section.id)
    if (!before) continue
    const beforeChildren = (before.children ?? []).join(',')
    const afterChildren = (section.children ?? []).join(',')
    if (beforeChildren !== afterChildren) {
      const rel = memoirSectionRelativePath(section.id)
      await writeFile(
        path.join(workspaceRoot, rel),
        serializeMemoirSectionFile(section),
        'utf8'
      )
    }
  }

  return { path: inputPath }
}

export async function reorderMemoirContainerChildren(
  workspaceRoot: string,
  parentId: string,
  orderedChildIds: string[]
): Promise<void> {
  const { sections } = await loadAllMemoirSectionFiles(workspaceRoot)
  const parent = sections.find((s) => s.id === parentId)
  if (!parent || !isMemoirContainerSectionType(parent.type)) {
    throw new Error(`Section "${parentId}" is not a container.`)
  }
  const current = parent.children ?? []
  if (orderedChildIds.length !== current.length) {
    throw new Error('Reorder must include every child section exactly once.')
  }
  const currentSet = new Set(current)
  for (const id of orderedChildIds) {
    if (!currentSet.has(id)) {
      throw new Error(`Section "${id}" is not a child of "${parentId}".`)
    }
  }
  const updated: MemoirSectionFile = { ...parent, children: [...orderedChildIds] }
  await writeMemoirSectionFile(workspaceRoot, updated)
}

export async function reparentMemoirSection(
  workspaceRoot: string,
  childId: string,
  newParentId: string | null
): Promise<void> {
  const { sections } = await loadAllMemoirSectionFiles(workspaceRoot)
  const child = sections.find((s) => s.id === childId)
  if (!child) throw new Error(`Section "${childId}" not found.`)
  if (child.children?.length) {
    throw new Error('Container sections cannot be reparented.')
  }

  const oldParent = sections.find((s) => s.children?.includes(childId))
  if (newParentId && oldParent?.id === newParentId) return

  if (oldParent) {
    const children = (oldParent.children ?? []).filter((id) => id !== childId)
    const { children: _drop, ...rest } = oldParent
    const updatedOld: MemoirSectionFile = children.length ? { ...rest, children } : rest
    await writeMemoirSectionFile(workspaceRoot, updatedOld)
  }

  if (!newParentId) {
    const roots = sections.filter(
      (s) => !sections.some((p) => p.children?.includes(s.id)) && s.id !== childId
    )
    const order = roots.length ? Math.max(...roots.map((s) => s.order), -1) + 1 : 0
    await writeMemoirSectionFile(workspaceRoot, { ...child, order })
    return
  }

  const newParent = sections.find((s) => s.id === newParentId)
  if (!newParent || !isMemoirContainerSectionType(newParent.type)) {
    throw new Error(`Section "${newParentId}" is not a valid container parent.`)
  }
  const allowed = memoirChildLeafTypesForContainer(newParent.type)
  if (!allowed.includes(child.type as (typeof allowed)[number])) {
    throw new Error(`Section type "${child.type}" cannot be added to "${newParent.type}".`)
  }
  const children = [...(newParent.children ?? []).filter((id) => id !== childId), childId]
  await writeMemoirSectionFile(workspaceRoot, { ...newParent, children })
}

export type MemoirSectionDuplicateMode = 'shallow' | 'deep'

function cloneMemoirProps(props: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(props)) as Record<string, unknown>
}

export async function duplicateMemoirSection(
  workspaceRoot: string,
  inputPath: string,
  mode: MemoirSectionDuplicateMode = 'shallow'
): Promise<{ path: string; section: MemoirSectionFile }> {
  const abs = path.join(workspaceRoot, inputPath)
  const content = await readFile(abs, 'utf8')
  const source = parseMemoirSectionFile(content, inputPath)
  const { sections } = await loadAllMemoirSectionFiles(workspaceRoot)
  let existingIds = sections.map((s) => s.id)
  const parent = sections.find((s) => s.children?.includes(source.id))
  const sourceChildren = source.children ?? []

  if (isMemoirContainerSectionType(source.type) && sourceChildren.length > 0 && mode === 'deep') {
    const newChildIds: string[] = []
    for (const childId of sourceChildren) {
      const child = sections.find((s) => s.id === childId)
      if (!child) continue
      const newChildId = uniqueMemoirSectionId(`${child.id}-copy`, existingIds)
      existingIds = [...existingIds, newChildId]
      newChildIds.push(newChildId)
      const childDup: MemoirSectionFile = {
        id: newChildId,
        type: child.type,
        order: child.order,
        published: false,
        props: cloneMemoirProps(child.props)
      }
      await writeMemoirSectionFile(workspaceRoot, childDup)
    }

    const newContainerId = uniqueMemoirSectionId(`${source.id}-copy`, existingIds)
    const containerDup: MemoirSectionFile = {
      id: newContainerId,
      type: source.type,
      order: nextMemoirSectionOrder(sections, parent?.id),
      published: false,
      props: cloneMemoirProps(source.props),
      children: newChildIds
    }
    return createMemoirSectionFile(
      workspaceRoot,
      containerDup,
      parent ? { parentId: parent.id } : undefined
    )
  }

  const newId = uniqueMemoirSectionId(`${source.id}-copy`, existingIds)
  const duplicate: MemoirSectionFile = {
    id: newId,
    type: source.type,
    order: nextMemoirSectionOrder(sections, parent?.id),
    published: false,
    props: cloneMemoirProps(source.props)
  }

  return createMemoirSectionFile(
    workspaceRoot,
    duplicate,
    parent ? { parentId: parent.id } : undefined
  )
}

export function memoirSectionSummaryFromFile(
  section: MemoirSectionFile,
  relativePath: string
) {
  return {
    path: relativePath,
    id: section.id,
    type: section.type,
    order: section.order,
    published: section.published,
    title: sectionTitleFromProps(section.type, section.props)
  }
}
