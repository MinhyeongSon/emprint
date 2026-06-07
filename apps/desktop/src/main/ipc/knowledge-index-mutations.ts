import path from 'node:path'
import { readFile, writeFile } from 'node:fs/promises'
import matter from 'gray-matter'
import { normalizeIndexPath } from '@emprint/shared'
import { applyPostPublishScopeChange, resolveSafeKnowledgePath, toPosixWorkspacePath } from './core'

export async function reassignKnowledgeEntryIndex(
  workspaceRoot: string,
  input: { path: string; index: string }
): Promise<{ path: string }> {
  const abs = resolveSafeKnowledgePath(workspaceRoot, input.path)
  if (!abs.toLowerCase().endsWith('.md')) {
    throw new Error('Only markdown knowledge entries can be reassigned.')
  }
  const content = await readFile(abs, 'utf8')
  const parsed = matter(content)
  const indexPath = normalizeIndexPath(input.index)
  if (indexPath) {
    parsed.data.index = indexPath
  } else {
    delete parsed.data.index
  }
  const nextMarkdown = matter.stringify(parsed.content, parsed.data)
  await writeFile(abs, nextMarkdown, 'utf8')
  const rel = toPosixWorkspacePath(path.relative(workspaceRoot, abs))
  await applyPostPublishScopeChange(workspaceRoot, rel, nextMarkdown)
  return { path: rel }
}
