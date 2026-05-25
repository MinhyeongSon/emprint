import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createStarterIndexRegistryArtifact } from '@emprint/core'
import {
  INDEX_REGISTRY_RELATIVE_PATH,
  type AppLocale,
  type SiteProjectKind,
  type WorkspaceConfig
} from '@emprint/shared'
import bookSyncThemeScript from '../site-generation/book/sync-theme.mjs?raw'
import columnSyncThemeScript from '../site-generation/column/sync-theme.mjs?raw'
import { getDictionarySiteTemplateArtifacts } from '../site-generation/dictionary/dictionary-layout-artifacts'
import dictionarySyncThemeScript from '../site-generation/dictionary/sync-theme.mjs?raw'
import fragmentsSyncThemeScript from '../site-generation/fragments/sync-theme.mjs?raw'

function syncThemeScriptForKind(kind: SiteProjectKind): string {
  if (kind === 'dictionary') return dictionarySyncThemeScript
  if (kind === 'fragments') return fragmentsSyncThemeScript
  if (kind === 'book') return bookSyncThemeScript
  return columnSyncThemeScript
}

/** Keep workspace scripts/sync-theme.mjs in sync with the app (fixes older bootstraps). */
export async function ensureWorkspaceSyncThemeScript(workspaceRoot: string): Promise<void> {
  const kind = await readWorkspaceAnthology(workspaceRoot)
  const scriptPath = path.join(workspaceRoot, 'scripts', 'sync-theme.mjs')
  await mkdir(path.dirname(scriptPath), { recursive: true })
  await writeFile(scriptPath, syncThemeScriptForKind(kind), 'utf8')
}

/** Write Dictionary Astro templates (IndexNav, pages, index-path lib) into an existing workspace. */
export async function ensureDictionarySiteTemplates(workspaceRoot: string): Promise<void> {
  const kind = await readWorkspaceAnthology(workspaceRoot)
  if (kind !== 'dictionary') return

  let locale: 'ko' | 'en' = 'en'
  try {
    const siteRaw = await readFile(path.join(workspaceRoot, 'config', 'site.json'), 'utf8')
    const site = JSON.parse(siteRaw) as { locale?: string }
    if (site.locale === 'ko') locale = 'ko'
  } catch {
    /* default en */
  }

  await ensureDictionaryIndexRegistry(workspaceRoot, locale)

  for (const artifact of getDictionarySiteTemplateArtifacts(locale)) {
    const abs = path.join(workspaceRoot, artifact.relativePath)
    await mkdir(path.dirname(abs), { recursive: true })
    await writeFile(abs, artifact.content, 'utf8')
  }
}

/** Ensure config/index-registry.json exists (older Dictionary workspaces may lack it). */
export async function ensureDictionaryIndexRegistry(
  workspaceRoot: string,
  locale: AppLocale = 'en'
): Promise<void> {
  const kind = await readWorkspaceAnthology(workspaceRoot)
  if (kind !== 'dictionary') return

  const registryPath = path.join(workspaceRoot, INDEX_REGISTRY_RELATIVE_PATH)
  if (existsSync(registryPath)) return

  const artifact = createStarterIndexRegistryArtifact({ locale } as WorkspaceConfig)
  await mkdir(path.dirname(registryPath), { recursive: true })
  await writeFile(registryPath, artifact.content, 'utf8')
}

export async function readWorkspaceAnthology(workspaceRoot: string): Promise<SiteProjectKind> {
  try {
    const raw = await readFile(path.join(workspaceRoot, 'config', 'theme.json'), 'utf8')
    const theme = JSON.parse(raw) as { anthology?: string }
    if (theme.anthology === 'memoir') return 'memoir'
    if (theme.anthology === 'dictionary') return 'dictionary'
    if (theme.anthology === 'fragments') return 'fragments'
    if (theme.anthology === 'book') return 'book'
    return 'column'
  } catch {
    return 'column'
  }
}
