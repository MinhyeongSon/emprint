import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import syncThemeScript from '../site-generation/column/sync-theme.mjs?raw'

/** Keep workspace scripts/sync-theme.mjs in sync with the app (fixes older bootstraps). */
export async function ensureWorkspaceSyncThemeScript(workspaceRoot: string): Promise<void> {
  const scriptPath = path.join(workspaceRoot, 'scripts', 'sync-theme.mjs')
  await mkdir(path.dirname(scriptPath), { recursive: true })
  await writeFile(scriptPath, syncThemeScript, 'utf8')
}

export async function readWorkspaceAnthology(workspaceRoot: string): Promise<'column' | 'memoir'> {
  try {
    const raw = await readFile(path.join(workspaceRoot, 'config', 'theme.json'), 'utf8')
    const theme = JSON.parse(raw) as { anthology?: string }
    return theme.anthology === 'memoir' ? 'memoir' : 'column'
  } catch {
    return 'column'
  }
}
