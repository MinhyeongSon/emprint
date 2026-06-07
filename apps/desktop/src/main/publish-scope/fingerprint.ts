import { existsSync } from 'node:fs'
import { readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import { WORKSPACE_DIR } from '@emprint/shared'
import { publishedMarkdownSection, resolveWorkspaceSiteProjectKind } from '../workspace/path-safety'

export async function flatDirFingerprint(dir: string): Promise<string> {
  if (!existsSync(dir)) return '0:0'
  const entries = await readdir(dir, { withFileTypes: true })
  let count = 0
  let maxMtime = 0
  for (const ent of entries) {
    if (!ent.isFile()) continue
    count++
    const st = await stat(path.join(dir, ent.name))
    maxMtime = Math.max(maxMtime, st.mtimeMs)
  }
  return `${count}:${maxMtime}`
}

export async function publishScopeFingerprint(workspaceRoot: string): Promise<string> {
  const kind = resolveWorkspaceSiteProjectKind(workspaceRoot)
  if (kind === 'book') {
    return flatDirFingerprint(path.join(workspaceRoot, WORKSPACE_DIR.story))
  }
  if (kind === 'fragments') {
    const manifestPath = path.join(workspaceRoot, 'config', 'artwork-manifest.json')
    let manifestFp = '0:0'
    if (existsSync(manifestPath)) {
      const st = await stat(manifestPath)
      manifestFp = `1:${st.mtimeMs}`
    }
    return [
      await flatDirFingerprint(path.join(workspaceRoot, WORKSPACE_DIR.artwork)),
      manifestFp
    ].join('|')
  }
  const published = publishedMarkdownSection(kind)
  return [
    await flatDirFingerprint(path.join(workspaceRoot, published)),
    await flatDirFingerprint(path.join(workspaceRoot, WORKSPACE_DIR.drafts)),
    await flatDirFingerprint(path.join(workspaceRoot, WORKSPACE_DIR.assetsImages))
  ].join('|')
}
