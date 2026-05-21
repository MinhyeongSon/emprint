/**
 * Paths Emprint treats as tooling noise — not user-authored publish content.
 * Kept in sync with workspace bootstrap `.gitignore` and main-process migrations.
 */
export const EMPRINT_GITIGNORE_LINES = [
  'drafts/',
  /** Astro sync mirror of `assets/` — never user publish content. */
  'public/assets/',
  'package-lock.json',
  'npm-debug.log*',
  '.pnpm-debug.log*'
] as const

function basenameMatches(filePath: string, pattern: string): boolean {
  const name = filePath.split('/').pop() ?? filePath
  if (pattern.endsWith('*')) {
    const prefix = pattern.slice(0, -1)
    return name.startsWith(prefix)
  }
  return name === pattern
}

/** Whether a working-tree path should be hidden from publish UI and left unstaged. */
export function isEmprintIgnoredPublishPath(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/').replace(/^\/+/, '')
  for (const line of EMPRINT_GITIGNORE_LINES) {
    const entry = line.trim()
    if (!entry) continue
    if (entry.endsWith('/')) {
      const dir = entry.replace(/\/+$/, '')
      if (normalized === dir || normalized.startsWith(`${dir}/`)) return true
      continue
    }
    if (entry.includes('/')) {
      if (normalized === entry || normalized.endsWith(`/${entry}`)) return true
      continue
    }
    if (basenameMatches(normalized, entry)) return true
  }
  return false
}
