import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { getColumnLayoutTemplateSyncArtifacts } from './site-generation/column/column-layout-artifacts'
import { getColumnPageTemplateSyncArtifacts } from './site-generation/column/column-page-artifacts'
import { createColumnGlobalCss, loadComponentsCss, loadLandingIntroCss } from './site-generation/column/column-styles'
import { createMemoirGlobalCss, loadMemoirComponentsCss, loadMemoirLandingIntroCss } from './site-generation/memoir/memoir-styles'
import { createLandingIntroArtifacts } from './site-generation/shared/landing-intro-artifacts'
import {
  columnThemeToTokensCss,
  memoirThemeToTokensCss,
  parseColumnThemeFile,
  parseMemoirThemeFile,
  type SiteProjectKind
} from '@emprint/shared'
import { getMemoirLayoutTemplateSyncArtifacts } from './site-generation/memoir/memoir-layout-artifacts'
import { getMemoirPageTemplateSyncArtifacts } from './site-generation/memoir/memoir-page-artifacts'

export const THEME_JSON_RELATIVE_PATH = 'config/theme.json'
export const TOKENS_CSS_RELATIVE_PATH = 'src/styles/tokens.css'
export const COMPONENTS_CSS_RELATIVE_PATH = 'src/styles/components.css'
export const GLOBAL_CSS_RELATIVE_PATH = 'src/styles/global.css'
export const LANDING_INTRO_CSS_RELATIVE_PATH = 'src/styles/landing-intro.css'

/** Regenerate token + component stylesheets from config/theme.json. */
export async function syncWorkspaceThemeFromFile(
  workspaceRoot: string,
  siteProjectKind?: SiteProjectKind
): Promise<void> {
  const themePath = path.join(workspaceRoot, THEME_JSON_RELATIVE_PATH)
  const raw = await readFile(themePath, 'utf8')
  const parsed = JSON.parse(raw) as { anthology?: string }
  const fromTheme = parsed.anthology === 'memoir' ? 'memoir' : 'column'
  const anthology = siteProjectKind ?? fromTheme

  const stylesDir = path.join(workspaceRoot, 'src/styles')
  await mkdir(stylesDir, { recursive: true })

  const classPrefix = anthology === 'memoir' ? 'ep-memoir' : 'ep-column'

  if (anthology === 'memoir') {
    const theme = parseMemoirThemeFile(raw)
    await writeFile(path.join(workspaceRoot, TOKENS_CSS_RELATIVE_PATH), memoirThemeToTokensCss(theme), 'utf8')
    await writeFile(path.join(workspaceRoot, COMPONENTS_CSS_RELATIVE_PATH), loadMemoirComponentsCss(), 'utf8')
    await writeFile(path.join(workspaceRoot, GLOBAL_CSS_RELATIVE_PATH), createMemoirGlobalCss(), 'utf8')
    await writeFile(path.join(workspaceRoot, LANDING_INTRO_CSS_RELATIVE_PATH), loadMemoirLandingIntroCss(), 'utf8')
    for (const artifact of [
      ...getMemoirLayoutTemplateSyncArtifacts(),
      ...getMemoirPageTemplateSyncArtifacts()
    ]) {
      const abs = path.join(workspaceRoot, artifact.relativePath)
      await mkdir(path.dirname(abs), { recursive: true })
      await writeFile(abs, artifact.content, 'utf8')
    }
  } else {
    const theme = parseColumnThemeFile(raw)
    await writeFile(path.join(workspaceRoot, TOKENS_CSS_RELATIVE_PATH), columnThemeToTokensCss(theme), 'utf8')
    await writeFile(path.join(workspaceRoot, COMPONENTS_CSS_RELATIVE_PATH), loadComponentsCss(), 'utf8')
    await writeFile(path.join(workspaceRoot, GLOBAL_CSS_RELATIVE_PATH), createColumnGlobalCss(), 'utf8')
    await writeFile(path.join(workspaceRoot, LANDING_INTRO_CSS_RELATIVE_PATH), loadLandingIntroCss(), 'utf8')
    for (const artifact of [
      ...getColumnLayoutTemplateSyncArtifacts(),
      ...getColumnPageTemplateSyncArtifacts()
    ]) {
      const abs = path.join(workspaceRoot, artifact.relativePath)
      await mkdir(path.dirname(abs), { recursive: true })
      await writeFile(abs, artifact.content, 'utf8')
    }
  }

  for (const artifact of createLandingIntroArtifacts(classPrefix)) {
    if (
      artifact.relativePath === 'src/components/LandingIntro.astro' ||
      artifact.relativePath === 'src/styles/landing-intro.css'
    ) {
      await writeFile(path.join(workspaceRoot, artifact.relativePath), artifact.content, 'utf8')
    }
  }
}
