import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { getColumnLayoutTemplateSyncArtifacts } from '../site-generation/column/column-layout-artifacts'
import { getColumnPageTemplateSyncArtifacts } from '../site-generation/column/column-page-artifacts'
import { createColumnGlobalCss, loadComponentsCss, loadLandingIntroCss } from '../site-generation/column/column-styles'
import { getDictionaryLayoutTemplateSyncArtifacts } from '../site-generation/dictionary/dictionary-layout-artifacts'
import { getDictionaryPageTemplateSyncArtifacts } from '../site-generation/dictionary/dictionary-page-artifacts'
import {
  createDictionaryGlobalCss,
  loadComponentsCss as loadDictionaryComponentsCss,
  loadLandingIntroCss as loadDictionaryLandingIntroCss
} from '../site-generation/dictionary/dictionary-styles'
import { createMemoirGlobalCss, loadMemoirComponentsCss, loadMemoirLandingIntroCss } from '../site-generation/memoir/memoir-styles'
import { createLandingIntroArtifacts } from '../site-generation/shared/landing-intro-artifacts'
import { getBookLayoutTemplateSyncArtifacts } from '../site-generation/book/book-layout-artifacts'
import { getBookPageTemplateSyncArtifacts } from '../site-generation/book/book-page-artifacts'
import {
  createBookGlobalCss,
  loadBookComponentsCss
} from '../site-generation/book/book-styles'
import { getFragmentsLayoutTemplateSyncArtifacts } from '../site-generation/fragments/fragments-layout-artifacts'
import { getFragmentsPageTemplateSyncArtifacts } from '../site-generation/fragments/fragments-page-artifacts'
import {
  createFragmentsGlobalCss,
  loadComponentsCss as loadFragmentsComponentsCss,
  loadLandingIntroCss as loadFragmentsLandingIntroCss
} from '../site-generation/fragments/fragments-styles'
import {
  bookThemeToTokensCss,
  columnThemeToTokensCss,
  dictionaryThemeToTokensCss,
  fragmentsThemeToTokensCss,
  memoirThemeToTokensCss,
  parseBookThemeFile,
  parseColumnThemeFile,
  parseDictionaryThemeFile,
  parseFragmentsThemeFile,
  parseMemoirThemeFile,
  type SiteProjectKind
} from '@emprint/shared'
import { getMemoirLayoutTemplateSyncArtifacts } from '../site-generation/memoir/memoir-layout-artifacts'
import { getMemoirPageTemplateSyncArtifacts } from '../site-generation/memoir/memoir-page-artifacts'
import { footerAstroContent, sitePublicLibArtifact } from '../site-generation/shared/footer-artifacts'
import { EpColumnClasses } from '../site-generation/column/contract'
import { EpDictionaryClasses } from '../site-generation/dictionary/contract'
import { EpBookClasses } from '../site-generation/book/contract'
import { EpFragmentsClasses } from '../site-generation/fragments/contract'
import { EpMemoirClasses } from '../site-generation/memoir/contract'
import { syncSiteCopyrightHolder } from './site-config-sync'

export const THEME_JSON_RELATIVE_PATH = 'config/theme.json'
export const TOKENS_CSS_RELATIVE_PATH = 'src/styles/tokens.css'
export const COMPONENTS_CSS_RELATIVE_PATH = 'src/styles/components.css'
export const GLOBAL_CSS_RELATIVE_PATH = 'src/styles/global.css'
export const LANDING_INTRO_CSS_RELATIVE_PATH = 'src/styles/landing-intro.css'

function anthologyFromThemeJson(raw: string): SiteProjectKind {
  const parsed = JSON.parse(raw) as { anthology?: string }
  if (parsed.anthology === 'memoir') return 'memoir'
  if (parsed.anthology === 'dictionary') return 'dictionary'
  if (parsed.anthology === 'fragments') return 'fragments'
  if (parsed.anthology === 'book') return 'book'
  return 'column'
}

/** Regenerate token + component stylesheets from config/theme.json. */
export async function syncWorkspaceThemeFromFile(
  workspaceRoot: string,
  siteProjectKind?: SiteProjectKind
): Promise<void> {
  const themePath = path.join(workspaceRoot, THEME_JSON_RELATIVE_PATH)
  const raw = await readFile(themePath, 'utf8')
  const anthology = siteProjectKind ?? anthologyFromThemeJson(raw)

  const stylesDir = path.join(workspaceRoot, 'src/styles')
  await mkdir(stylesDir, { recursive: true })

  const classPrefix =
    anthology === 'memoir'
      ? 'ep-memoir'
      : anthology === 'dictionary'
        ? 'ep-dictionary'
        : anthology === 'fragments'
          ? 'ep-fragments'
          : anthology === 'book'
            ? 'ep-book'
            : 'ep-column'

  if (anthology === 'book') {
    const theme = parseBookThemeFile(raw)
    await writeFile(path.join(workspaceRoot, TOKENS_CSS_RELATIVE_PATH), bookThemeToTokensCss(theme), 'utf8')
    await writeFile(path.join(workspaceRoot, COMPONENTS_CSS_RELATIVE_PATH), loadBookComponentsCss(), 'utf8')
    await writeFile(path.join(workspaceRoot, GLOBAL_CSS_RELATIVE_PATH), createBookGlobalCss(), 'utf8')
    for (const artifact of [
      ...getBookLayoutTemplateSyncArtifacts(),
      ...getBookPageTemplateSyncArtifacts()
    ]) {
      const abs = path.join(workspaceRoot, artifact.relativePath)
      await mkdir(path.dirname(abs), { recursive: true })
      await writeFile(abs, artifact.content, 'utf8')
    }
  } else if (anthology === 'fragments') {
    const theme = parseFragmentsThemeFile(raw)
    await writeFile(path.join(workspaceRoot, TOKENS_CSS_RELATIVE_PATH), fragmentsThemeToTokensCss(theme), 'utf8')
    await writeFile(path.join(workspaceRoot, COMPONENTS_CSS_RELATIVE_PATH), loadFragmentsComponentsCss(), 'utf8')
    await writeFile(path.join(workspaceRoot, GLOBAL_CSS_RELATIVE_PATH), createFragmentsGlobalCss(), 'utf8')
    await writeFile(path.join(workspaceRoot, LANDING_INTRO_CSS_RELATIVE_PATH), loadFragmentsLandingIntroCss(), 'utf8')
    for (const artifact of [
      ...getFragmentsLayoutTemplateSyncArtifacts(),
      ...getFragmentsPageTemplateSyncArtifacts()
    ]) {
      const abs = path.join(workspaceRoot, artifact.relativePath)
      await mkdir(path.dirname(abs), { recursive: true })
      await writeFile(abs, artifact.content, 'utf8')
    }
  } else if (anthology === 'memoir') {
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
  } else if (anthology === 'dictionary') {
    const theme = parseDictionaryThemeFile(raw)
    await writeFile(path.join(workspaceRoot, TOKENS_CSS_RELATIVE_PATH), dictionaryThemeToTokensCss(theme), 'utf8')
    await writeFile(path.join(workspaceRoot, COMPONENTS_CSS_RELATIVE_PATH), loadDictionaryComponentsCss(), 'utf8')
    await writeFile(path.join(workspaceRoot, GLOBAL_CSS_RELATIVE_PATH), createDictionaryGlobalCss(), 'utf8')
    await writeFile(path.join(workspaceRoot, LANDING_INTRO_CSS_RELATIVE_PATH), loadDictionaryLandingIntroCss(), 'utf8')
    for (const artifact of [
      ...getDictionaryLayoutTemplateSyncArtifacts(),
      ...getDictionaryPageTemplateSyncArtifacts()
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

  await syncWorkspaceFooterTemplate(workspaceRoot, anthology)
  await syncSiteCopyrightHolder(workspaceRoot)
}

async function syncWorkspaceFooterTemplate(
  workspaceRoot: string,
  anthology: SiteProjectKind,
  lang: 'ko' | 'en' = 'en'
): Promise<void> {
  const sitePublic = sitePublicLibArtifact()
  await writeFile(path.join(workspaceRoot, sitePublic.relativePath), sitePublic.content, 'utf8')

  let footerContent: string
  switch (anthology) {
    case 'book':
      footerContent = footerAstroContent({
        footerClass: EpBookClasses.Footer,
        footerInnerClass: EpBookClasses.FooterInner,
        mutedClass: EpBookClasses.Muted,
        lang
      })
      break
    case 'fragments':
      footerContent = footerAstroContent({
        footerClass: EpFragmentsClasses.Footer,
        footerInnerClass: EpFragmentsClasses.FooterInner,
        mutedClass: EpFragmentsClasses.Muted,
        lang
      })
      break
    case 'dictionary':
      footerContent = footerAstroContent({
        footerClass: EpDictionaryClasses.Footer,
        footerInnerClass: EpDictionaryClasses.FooterInner,
        wideClass: EpDictionaryClasses.Wide,
        lang,
        publishedWithEmprint: true
      })
      break
    case 'memoir':
      footerContent = footerAstroContent({
        footerClass: EpMemoirClasses.Footer,
        footerInnerClass: EpMemoirClasses.FooterInner,
        wideClass: EpMemoirClasses.Wide,
        lang,
        publishedWithEmprint: true
      })
      break
    default:
      footerContent = footerAstroContent({
        footerClass: EpColumnClasses.Footer,
        footerInnerClass: EpColumnClasses.FooterInner,
        wideClass: EpColumnClasses.Wide,
        lang,
        publishedWithEmprint: true
      })
  }

  const footerPath = path.join(workspaceRoot, 'src/components/Footer.astro')
  await mkdir(path.dirname(footerPath), { recursive: true })
  await writeFile(footerPath, footerContent, 'utf8')
}
