import type { WorkspaceArtifact } from '@emprint/core'
import type { SiteGenerationContext } from '../site-project-generator'
import syncThemeScript from '../column/sync-theme.mjs?raw'
import { EpMemoirClasses } from './contract'
import {
  createMemoirGlobalCss,
  createMemoirThemeJson,
  createDefaultMemoirTheme,
  loadMemoirComponentsCss,
  memoirThemeToTokensCss
} from './memoir-styles'
import { createMemoirPageArtifacts } from './memoir-page-artifacts'
import { createMemoirRichTextArtifacts } from './memoir-rich-text-artifact'
import { createLandingIntroArtifacts } from '../shared/landing-intro-artifacts'
import { footerAstroContent, sitePublicLibArtifact } from '../shared/footer-artifacts'

export function createMemoirThemeArtifacts(ctx: SiteGenerationContext): WorkspaceArtifact[] {
  const theme = createDefaultMemoirTheme(ctx)
  return [
    { relativePath: 'config/theme.json', content: createMemoirThemeJson(ctx) },
    { relativePath: 'src/styles/tokens.css', content: memoirThemeToTokensCss(theme) },
    { relativePath: 'src/styles/components.css', content: loadMemoirComponentsCss() },
    { relativePath: 'src/styles/global.css', content: createMemoirGlobalCss() },
    { relativePath: 'scripts/sync-theme.mjs', content: syncThemeScript }
  ]
}

export function createMemoirLayoutArtifacts(ctx: SiteGenerationContext): WorkspaceArtifact[] {
  const lang = ctx.locale === 'ko' ? 'ko' : 'en'
  const titleJson = JSON.stringify(ctx.title)
  const descriptionJson = JSON.stringify(ctx.description)

  return [
    ...createMemoirThemeArtifacts(ctx),
    sitePublicLibArtifact(),
    {
      relativePath: 'src/lib/site.ts',
      content: `import siteConfig from '../../config/site.json'

export interface SiteConfig {
  title: string
  description: string
  themeColor?: string
  layoutStyle?: string
}

const config = siteConfig as SiteConfig

export const SITE_TITLE = config.title || ${titleJson}
export const SITE_DESCRIPTION = config.description || ${descriptionJson}
export const SITE_LANG = '${lang}'
`
    },
    {
      relativePath: 'src/components/ThemeToggle.astro',
      content: themeToggleAstro(lang)
    },
    {
      relativePath: 'src/components/Header.astro',
      content: headerAstro(lang)
    },
    {
      relativePath: 'src/components/Footer.astro',
      content: footerAstro(lang)
    },
    {
      relativePath: 'src/layouts/Layout.astro',
      content: layoutAstro()
    },
    ...createMemoirRichTextArtifacts(),
    ...createLandingIntroArtifacts('ep-memoir'),
    ...createMemoirPageArtifacts()
  ]
}

function themeToggleAstro(lang: 'ko' | 'en'): string {
  const label = lang === 'ko' ? '테마' : 'Theme'
  const system = lang === 'ko' ? '시스템' : 'System'
  const light = lang === 'ko' ? '라이트' : 'Light'
  const dark = lang === 'ko' ? '다크' : 'Dark'
  return `---
import themeFile from '../../config/theme.json'

const defaultMode =
  themeFile.colorMode === 'light' || themeFile.colorMode === 'dark' || themeFile.colorMode === 'system'
    ? themeFile.colorMode
    : 'system'
---

<div
  class="${EpMemoirClasses.ThemeToggle}"
  role="group"
  aria-label="${label}"
  data-ep-theme-toggle
  data-default-mode={defaultMode}
>
  <button type="button" class="${EpMemoirClasses.ThemeToggleBtn}" data-ep-theme-mode="system" aria-pressed="false">${system}</button>
  <button type="button" class="${EpMemoirClasses.ThemeToggleBtn}" data-ep-theme-mode="light" aria-pressed="false">${light}</button>
  <button type="button" class="${EpMemoirClasses.ThemeToggleBtn}" data-ep-theme-mode="dark" aria-pressed="false">${dark}</button>
</div>

<script>
  const root = document.documentElement
  const group = document.querySelector('[data-ep-theme-toggle]')
  if (!group) throw new Error('Theme toggle missing')
  const storageKey = 'ep-memoir-color-mode'
  const defaultMode = group.getAttribute('data-default-mode') || 'system'
  const buttons = group.querySelectorAll('[data-ep-theme-mode]')
  function readStored() {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
    } catch { /* ignore */ }
    return defaultMode
  }
  function apply(mode) {
    root.setAttribute('data-ep-color-mode', mode)
    try { localStorage.setItem(storageKey, mode) } catch { /* ignore */ }
    buttons.forEach((btn) => {
      btn.setAttribute('aria-pressed', btn.getAttribute('data-ep-theme-mode') === mode ? 'true' : 'false')
    })
  }
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = btn.getAttribute('data-ep-theme-mode')
      if (mode === 'light' || mode === 'dark' || mode === 'system') apply(mode)
    })
  })
  apply(readStored())
</script>
`
}

function headerAstro(_lang: 'ko' | 'en'): string {
  return `---
import ThemeToggle from './ThemeToggle.astro'
---

<header class="${EpMemoirClasses.Header}">
  <div class="${EpMemoirClasses.HeaderInner} ${EpMemoirClasses.Wide}">
    <div class="${EpMemoirClasses.HeaderTools}">
      <ThemeToggle />
    </div>
  </div>
</header>
`
}

function footerAstro(lang: 'ko' | 'en'): string {
  return footerAstroContent({
    footerClass: EpMemoirClasses.Footer,
    footerInnerClass: EpMemoirClasses.FooterInner,
    wideClass: EpMemoirClasses.Wide,
    lang,
    publishedWithEmprint: true
  })
}

function layoutAstro(): string {
  return `---
import '../styles/global.css'
import Header from '../components/Header.astro'
import Footer from '../components/Footer.astro'
import LandingIntro from '../components/LandingIntro.astro'
import themeFile from '../../config/theme.json'
import { SITE_LANG, SITE_TITLE, SITE_DESCRIPTION } from '../lib/site'

interface Props {
  title?: string
  description?: string
}

const { title, description } = Astro.props
const fullTitle = title ? \`\${title} · \${SITE_TITLE}\` : SITE_TITLE
const meta = description ?? SITE_DESCRIPTION
const defaultColorMode =
  themeFile.colorMode === 'light' || themeFile.colorMode === 'dark' || themeFile.colorMode === 'system'
    ? themeFile.colorMode
    : 'system'
const layoutComposition =
  themeFile.layoutComposition === 'grid' ||
  themeFile.layoutComposition === 'editorial' ||
  themeFile.layoutComposition === 'timeline'
    ? themeFile.layoutComposition
    : 'timeline'
---

<!DOCTYPE html>
<html lang={SITE_LANG} data-ep-layout-composition={layoutComposition}>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content={meta} />
    <link rel="icon" type="image/svg+xml" href={\`\${import.meta.env.BASE_URL}favicon.svg\`} />
    <title>{fullTitle}</title>
    <script is:inline define:vars={{ defaultColorMode }}>
      (function () {
        var k = 'ep-memoir-color-mode'
        var m = defaultColorMode
        try {
          var s = localStorage.getItem(k)
          if (s === 'light' || s === 'dark' || s === 'system') m = s
        } catch (e) {}
        document.documentElement.setAttribute('data-ep-color-mode', m)
      })()
    </script>
  </head>
  <body>
    <LandingIntro />
    <div class="${EpMemoirClasses.Site}">
      <Header />
      <main>
        <slot />
      </main>
      <Footer />
    </div>
  </body>
</html>
`
}

/** Astro shells updated when theme.json is saved (layout composition + landing intro). */
export function getMemoirLayoutTemplateSyncArtifacts(): WorkspaceArtifact[] {
  return [{ relativePath: 'src/layouts/Layout.astro', content: layoutAstro() }]
}
