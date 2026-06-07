import type { WorkspaceArtifact } from '@emprint/core'
import type { SiteGenerationContext } from '../site-project-generator'
import { bookThemeToTokensCss } from '@emprint/shared'
import { EpBookClasses } from './contract'
import {
  createBookGlobalCss,
  createBookThemeJson,
  createDefaultBookTheme,
  loadBookComponentsCss
} from './book-styles'
import { createBookPageArtifacts } from './book-page-artifacts'
import syncThemeScript from './sync-theme.mjs?raw'
import { footerAstroContent, sitePublicLibArtifact } from '../shared/footer-artifacts'

export function createBookThemeArtifacts(ctx: SiteGenerationContext): WorkspaceArtifact[] {
  const theme = createDefaultBookTheme(ctx)
  return [
    { relativePath: 'config/theme.json', content: createBookThemeJson(ctx) },
    { relativePath: 'src/styles/tokens.css', content: bookThemeToTokensCss(theme) },
    { relativePath: 'src/styles/components.css', content: loadBookComponentsCss() },
    { relativePath: 'src/styles/global.css', content: createBookGlobalCss() },
    { relativePath: 'scripts/sync-theme.mjs', content: syncThemeScript }
  ]
}

const BOOK_TEMPLATE_SYNC_PATHS = new Set([
  'src/components/Footer.astro',
  'src/components/BookPages.astro',
  'src/components/BookScroll.astro',
  'src/components/ThemeToggle.astro',
  'src/pages/index.astro',
  'src/layouts/Layout.astro',
  'src/lib/site-public.ts'
])

export function getBookLayoutTemplateSyncArtifacts(): WorkspaceArtifact[] {
  const lang = 'en'
  return createBookComponentArtifacts(lang).filter((a) => BOOK_TEMPLATE_SYNC_PATHS.has(a.relativePath))
}

export function getBookSiteTemplateArtifacts(locale: 'ko' | 'en' = 'en'): WorkspaceArtifact[] {
  return [...createBookComponentArtifacts(locale), ...createBookPageArtifacts()]
}

export function createBookLayoutArtifacts(ctx: SiteGenerationContext): WorkspaceArtifact[] {
  const lang = ctx.locale === 'ko' ? 'ko' : 'en'
  const titleJson = JSON.stringify(ctx.title)
  const descriptionJson = JSON.stringify(ctx.description)

  return [
    ...createBookThemeArtifacts(ctx),
    sitePublicLibArtifact(),
    {
      relativePath: 'src/lib/site.ts',
      content: `import siteConfig from '../../config/site.json'

export const SITE_TITLE = (siteConfig as { title?: string }).title || ${titleJson}
export const SITE_DESCRIPTION = (siteConfig as { description?: string }).description || ${descriptionJson}
export const SITE_LANG = '${lang}'
`
    },
    ...createBookComponentArtifacts(lang),
    ...createBookPageArtifacts()
  ]
}

function createBookComponentArtifacts(lang: 'ko' | 'en'): WorkspaceArtifact[] {
  const EP = EpBookClasses
  return [
    { relativePath: 'src/components/ThemeToggle.astro', content: themeToggleAstro(EP) },
    {
      relativePath: 'src/components/Footer.astro',
      content: footerAstroContent({
        footerClass: EP.Footer,
        footerInnerClass: EP.FooterInner,
        mutedClass: EP.Muted,
        lang
      })
    },
    { relativePath: 'src/layouts/Layout.astro', content: layoutAstro(EP, lang) },
    { relativePath: 'src/components/BookPages.astro', content: bookPagesAstro(EP, lang) },
    { relativePath: 'src/components/BookScroll.astro', content: bookScrollAstro(EP) }
  ]
}

function themeToggleAstro(EP: typeof EpBookClasses): string {
  return `---
import themeFile from '../../config/theme.json'
const defaultMode = themeFile.colorMode ?? 'system'
---
<div class="${EP.ThemeFab}" data-ep-theme-toggle data-default={defaultMode} role="group" aria-label="Color mode">
  <button type="button" class="${EP.ThemeFabBtn}" data-mode="light" aria-label="Light" title="Light">☀</button>
  <button type="button" class="${EP.ThemeFabBtn}" data-mode="dark" aria-label="Dark" title="Dark">☾</button>
  <button type="button" class="${EP.ThemeFabBtn}" data-mode="system" aria-label="System" title="System">◇</button>
</div>
<script>
  const KEY = 'ep-color-mode'
  const root = document.documentElement
  const wrap = document.querySelector('[data-ep-theme-toggle]')
  if (!wrap) throw new Error('missing theme toggle')
  const def = wrap.getAttribute('data-default') || 'system'
  function apply(mode) {
    root.setAttribute('data-ep-color-mode', mode)
    localStorage.setItem(KEY, mode)
    wrap.querySelectorAll('[data-mode]').forEach((btn) => {
      btn.setAttribute('aria-pressed', btn.getAttribute('data-mode') === mode ? 'true' : 'false')
    })
  }
  apply(localStorage.getItem(KEY) || def)
  wrap.addEventListener('click', (e) => {
    const t = e.target
    if (!(t instanceof HTMLElement)) return
    const mode = t.closest('[data-mode]')?.getAttribute('data-mode')
    if (mode) apply(mode)
  })
</script>
`
}

function layoutAstro(EP: typeof EpBookClasses, lang: 'ko' | 'en'): string {
  return `---
import '../styles/global.css'
import Footer from '../components/Footer.astro'
import ThemeToggle from '../components/ThemeToggle.astro'
import { SITE_TITLE, SITE_DESCRIPTION, SITE_LANG } from '../lib/site'
import themeFile from '../../config/theme.json'

interface Props {
  title?: string
  description?: string
  current?: string
}

const { title, description, current } = Astro.props
const pageTitle = title ? \`\${title} · \${SITE_TITLE}\` : SITE_TITLE
const pageDesc =
  typeof description === 'string' && description.trim() ? description.trim() : SITE_DESCRIPTION
const paletteId = themeFile.paletteId ?? 'emprint'
const composition = themeFile.layoutComposition === 'scroll' ? 'scroll' : 'pages'
---
<!doctype html>
<html
  lang={SITE_LANG}
  data-ep-layout-composition={composition}
  data-ep-palette={paletteId}
  data-ep-color-mode="system"
>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content={pageDesc} />
    <title>{pageTitle}</title>
    <link rel="icon" type="image/svg+xml" href={\`\${import.meta.env.BASE_URL}favicon.svg\`} />
  </head>
  <body class="${EP.Site}">
    <ThemeToggle />
    <main class="${EP.Story}" data-current={current}>
      <slot />
    </main>
    <Footer />
  </body>
</html>
`
}

function bookPagesAstro(EP: typeof EpBookClasses, lang: 'ko' | 'en'): string {
  const prevLabel = lang === 'ko' ? '이전 페이지' : 'Previous page'
  const nextLabel = lang === 'ko' ? '다음 페이지' : 'Next page'
  const pagesNavLabel = lang === 'ko' ? '페이지' : 'Pages'
  return `---
import { marked } from 'marked'

interface Props {
  title: string
  raw: string
  subtitle?: string
  description?: string
  author?: string
}

const { title, raw, subtitle, description, author } = Astro.props

function stripFrontmatter(source: string): string {
  const trimmed = source.replace(/^\\uFEFF/, '').trimStart()
  if (!trimmed.startsWith('---')) return trimmed
  const end = trimmed.match(/^---\\r?\\n[\\s\\S]*?\\r?\\n---\\r?\\n?/)
  return end ? trimmed.slice(end[0].length).trim() : trimmed
}

/** Page breaks: a line containing only --- (optional spaces). */
function splitPages(source: string): string[] {
  const body = stripFrontmatter(source)
  if (!body) return ['']
  const parts = body
    .split(/(?:\\r?\\n)\\s*---\\s*(?:\\r?\\n)/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
  return parts.length > 0 ? parts : [body]
}

const pageCount = splitPages(raw).length
const pagesHtml = splitPages(raw).map((md) => String(marked.parse(md)))
const hasPages = pageCount > 1
---
<div class="${EP.Pages}" data-book-pages data-page-count={pageCount}>
  <h1 class="${EP.StoryTitle}">{title}</h1>
  {(subtitle || description || author) ? (
    <div class="${EP.StoryLead}">
      {subtitle ? <p class="${EP.StorySubtitle}">{subtitle}</p> : null}
      {description ? <p class="${EP.StoryDescription}">{description}</p> : null}
      {author ? <p class="${EP.StoryAuthor}">{author}</p> : null}
    </div>
  ) : null}
  <div class="${EP.PagesStage}">
    {pagesHtml.map((html, index) => (
      <article
        class:list={['${EP.PagesSheet}', { 'is-active': index === 0 }]}
        data-page-sheet
        data-index={index}
      >
        <div class="${EP.PagesSheetInner}">
          <div class="${EP.Prose}" set:html={html} />
        </div>
      </article>
    ))}
  </div>
  {hasPages ? (
    <nav class="${EP.PagesNav}" data-book-pages-nav aria-label="${pagesNavLabel}">
      <button type="button" class="${EP.PagesNavBtn}" data-page-prev aria-label="${prevLabel}">‹</button>
      <span class="${EP.PagesIndicator}" data-page-indicator>1 / {pageCount}</span>
      <button type="button" class="${EP.PagesNavBtn}" data-page-next aria-label="${nextLabel}">›</button>
    </nav>
  ) : null}
</div>
<script is:inline>
  (function () {
    const root = document.querySelector('[data-book-pages]')
    if (!root) return
    const count = Number(root.getAttribute('data-page-count') || '1')
    if (count <= 1) return

    const sheets = Array.from(root.querySelectorAll('[data-page-sheet]'))
    const prevBtn = root.querySelector('[data-page-prev]')
    const nextBtn = root.querySelector('[data-page-next]')
    const indicator = root.querySelector('[data-page-indicator]')
    let index = 0

    function syncControls() {
      if (indicator) indicator.textContent = String(index + 1) + ' / ' + String(sheets.length)
      if (prevBtn) prevBtn.disabled = index <= 0
      if (nextBtn) nextBtn.disabled = index >= sheets.length - 1
    }

    function activate(next) {
      if (next < 0 || next >= sheets.length || next === index) return
      const target = sheets[next]
      if (!target) return
      const leaving = sheets[index]
      sheets.forEach(function (s) {
        s.classList.remove('is-active', 'is-leaving')
      })
      if (leaving && leaving !== target) {
        leaving.classList.add('is-leaving')
        window.setTimeout(function () {
          leaving.classList.remove('is-leaving')
        }, 480)
      }
      target.classList.add('is-active')
      index = next
      syncControls()
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', function (e) {
        e.preventDefault()
        activate(index - 1)
      })
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', function (e) {
        e.preventDefault()
        activate(index + 1)
      })
    }
    document.addEventListener('keydown', function (e) {
      if (e.target && (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) return
      if (e.key === 'ArrowLeft') activate(index - 1)
      if (e.key === 'ArrowRight') activate(index + 1)
    })
    syncControls()
  })()
</script>
`
}

function bookScrollAstro(EP: typeof EpBookClasses): string {
  return `---
import { marked } from 'marked'

interface Props {
  title: string
  raw: string
  subtitle?: string
  description?: string
  author?: string
}

const { title, raw, subtitle, description, author } = Astro.props

function stripFrontmatter(source: string): string {
  const trimmed = source.replace(/^\\uFEFF/, '').trimStart()
  if (!trimmed.startsWith('---')) return trimmed
  const end = trimmed.match(/^---\\r?\\n[\\s\\S]*?\\r?\\n---\\r?\\n?/)
  return end ? trimmed.slice(end[0].length).trim() : trimmed
}

/** Remove page-break lines (---) so Scroll reads as one continuous story. */
function scrollMarkdown(source: string): string {
  return stripFrontmatter(source)
    .split(/\\r?\\n/)
    .filter((line) => !/^\\s*---\\s*$/.test(line))
    .join('\\n')
    .trim()
}

const html = String(marked.parse(scrollMarkdown(raw)))
---
<div class="${EP.Scroll}">
  <h1 class="${EP.StoryTitle}">{title}</h1>
  {(subtitle || description || author) ? (
    <div class="${EP.StoryLead}">
      {subtitle ? <p class="${EP.StorySubtitle}">{subtitle}</p> : null}
      {description ? <p class="${EP.StoryDescription}">{description}</p> : null}
      {author ? <p class="${EP.StoryAuthor}">{author}</p> : null}
    </div>
  ) : null}
  <div class="${EP.ScrollInner}">
    <div class="${EP.Prose}" set:html={html} />
  </div>
</div>
`
}
