/**
 * Hierarchical index paths for Dictionary knowledge entries.
 * Stored as a single frontmatter string: "Science/Physics/Quantum".
 */

/** Normalize user input to a stable POSIX-style index path (no leading/trailing slashes). */
export function normalizeIndexPath(raw: string): string {
  return raw
    .replace(/\\/g, '/')
    .trim()
    .replace(/^\/+|\/+$/g, '')
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean)
    .join('/')
}

export function indexSegments(indexPath: string): string[] {
  const normalized = normalizeIndexPath(indexPath)
  if (!normalized) return []
  return normalized.split('/')
}

/** Parent path ("A/B/C" → "A/B") or "" for top-level. */
export function parentIndexPath(indexPath: string): string {
  const segments = indexSegments(indexPath)
  if (segments.length <= 1) return ''
  return segments.slice(0, -1).join('/')
}

/** True when `candidate` is a prefix path of `indexPath` (or equal). */
export function isIndexPrefix(candidate: string, indexPath: string): boolean {
  const c = normalizeIndexPath(candidate)
  const t = normalizeIndexPath(indexPath)
  if (!c) return true
  if (!t) return false
  if (c === t) return true
  return t.startsWith(`${c}/`)
}

/** Collect every prefix along a path ("A/B/C" → ["A", "A/B", "A/B/C"]). */
export function indexPathPrefixes(indexPath: string): string[] {
  const segments = indexSegments(indexPath)
  const out: string[] = []
  for (let i = 0; i < segments.length; i++) {
    out.push(segments.slice(0, i + 1).join('/'))
  }
  return out
}

export interface IndexTreeNode {
  path: string
  label: string
  children: IndexTreeNode[]
}

/** Build a tree from a list of index path strings (for filter UI). */
export function buildIndexTree(paths: Iterable<string>): IndexTreeNode[] {
  const root = new Map<string, IndexTreeNode>()

  const ensure = (path: string): IndexTreeNode => {
    const existing = root.get(path)
    if (existing) return existing
    const segments = indexSegments(path)
    const node: IndexTreeNode = {
      path,
      label: segments[segments.length - 1] ?? path,
      children: []
    }
    root.set(path, node)
    const parent = parentIndexPath(path)
    if (parent) {
      ensure(parent).children.push(node)
    }
    return node
  }

  for (const raw of paths) {
    const normalized = normalizeIndexPath(raw)
    if (!normalized) continue
    for (const prefix of indexPathPrefixes(normalized)) {
      ensure(prefix)
    }
  }

  const topLevel: IndexTreeNode[] = []
  for (const node of root.values()) {
    if (!parentIndexPath(node.path)) topLevel.push(node)
  }

  const sortNodes = (nodes: IndexTreeNode[]): void => {
    nodes.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }))
    for (const n of nodes) sortNodes(n.children)
  }
  sortNodes(topLevel)
  return topLevel
}
