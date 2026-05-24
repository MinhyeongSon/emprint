import type { WorkspaceArtifact } from '@emprint/core'
import type { SiteGenerationContext } from '../site-project-generator'
import { EpDictionaryClasses } from './contract'
import {
  createDictionaryGlobalCss,
  createDictionaryThemeJson,
  createDefaultDictionaryTheme,
  loadComponentsCss
} from './dictionary-styles'
import { dictionaryThemeToTokensCss } from '@emprint/shared'
import { createDictionaryPageArtifacts } from './dictionary-page-artifacts'
import syncThemeScript from './sync-theme.mjs?raw'
import { createLandingIntroArtifacts } from '../shared/landing-intro-artifacts'

export function createDictionaryThemeArtifacts(ctx: SiteGenerationContext): WorkspaceArtifact[] {
  const theme = createDefaultDictionaryTheme(ctx)
  return [
    { relativePath: 'config/theme.json', content: createDictionaryThemeJson(ctx) },
    { relativePath: 'src/styles/tokens.css', content: dictionaryThemeToTokensCss(theme) },
    { relativePath: 'src/styles/components.css', content: loadComponentsCss() },
    { relativePath: 'src/styles/global.css', content: createDictionaryGlobalCss() },
    {
      relativePath: 'scripts/sync-theme.mjs',
      content: syncThemeScript
    }
  ]
}

const DICTIONARY_TEMPLATE_SYNC_PATHS = new Set([
  'src/components/Header.astro',
  'src/lib/index-path.ts',
  'src/components/IndexNav.astro',
  'src/components/KnowledgeCard.astro',
  'src/components/DictionaryKnowledgeFeed.astro',
  'src/layouts/Layout.astro',
  'src/layouts/PostLayout.astro'
])

/** Astro shells updated when theme.json is saved (layout composition). */
export function getDictionaryLayoutTemplateSyncArtifacts(): WorkspaceArtifact[] {
  const lang = 'en'
  return createDictionaryComponentArtifacts(lang).filter((a) => DICTIONARY_TEMPLATE_SYNC_PATHS.has(a.relativePath))
}

/** Components, pages, and index helpers — refreshed on preview/theme sync for existing workspaces. */
export function getDictionarySiteTemplateArtifacts(locale: 'ko' | 'en' = 'en'): WorkspaceArtifact[] {
  return [
    { relativePath: 'src/lib/index-path.ts', content: indexPathLibSource() },
    { relativePath: 'src/lib/index-registry.ts', content: indexRegistryLibSource() },
    ...createDictionaryComponentArtifacts(locale),
    ...createDictionaryPageArtifacts()
  ]
}

export function createDictionaryLayoutArtifacts(ctx: SiteGenerationContext): WorkspaceArtifact[] {
  const lang = ctx.locale === 'ko' ? 'ko' : 'en'
  const titleJson = JSON.stringify(ctx.title)
  const descriptionJson = JSON.stringify(ctx.description)

  return [
    ...createDictionaryThemeArtifacts(ctx),
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

export function formatDate(input?: Date): string {
  if (!input) return ''
  const d = input instanceof Date ? input : new Date(input)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('${lang === 'ko' ? 'ko-KR' : 'en-US'}', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}
`
    },
    {
      relativePath: 'src/lib/index-path.ts',
      content: indexPathLibSource()
    },
    {
      relativePath: 'src/lib/index-registry.ts',
      content: indexRegistryLibSource()
    },
    ...createDictionaryComponentArtifacts(lang),
    ...createLandingIntroArtifacts('ep-dictionary'),
    ...createDictionaryPageArtifacts()
  ]
}

function createDictionaryComponentArtifacts(lang: 'ko' | 'en'): WorkspaceArtifact[] {
  return [
    {
      relativePath: 'src/components/ThemeToggle.astro',
      content: themeToggleAstro(lang)
    },
    {
      relativePath: 'src/components/IndexNav.astro',
      content: indexNavAstro(lang)
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
      relativePath: 'src/components/KnowledgeCard.astro',
      content: postCardAstro()
    },
    {
      relativePath: 'src/components/DictionaryKnowledgeFeed.astro',
      content: dictionaryKnowledgeFeedAstro()
    },
    {
      relativePath: 'src/layouts/Layout.astro',
      content: layoutAstro()
    },
    {
      relativePath: 'src/layouts/PostLayout.astro',
      content: postLayoutAstro()
    }
  ]
}

function indexPathLibSource(): string {
  return `/** Hierarchical index paths (mirrors Emprint shared/dictionary/index-path). */

export function normalizeIndexPath(raw: string): string {
  return raw
    .replace(/\\\\/g, '/')
    .trim()
    .replace(/^\\/+|\\/+$/g, '')
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

export function indexPathPrefixes(indexPath: string): string[] {
  const segments = indexSegments(indexPath)
  const out: string[] = []
  for (let i = 0; i < segments.length; i++) {
    out.push(segments.slice(0, i + 1).join('/'))
  }
  return out
}

/** True when \`candidate\` is a prefix path of \`indexPath\` (or equal). */
export function isIndexPrefix(candidate: string, indexPath: string): boolean {
  const c = normalizeIndexPath(candidate)
  const t = normalizeIndexPath(indexPath)
  if (!c) return true
  if (!t) return false
  if (c === t) return true
  return t.startsWith(\`\${c}/\`)
}

export function collectIndexPathsFromEntries(
  entries: Array<{ data: { index?: string } }>
): string[] {
  const paths = new Set<string>()
  for (const entry of entries) {
    const idx = normalizeIndexPath(String(entry.data.index ?? ''))
    if (!idx) continue
    for (const prefix of indexPathPrefixes(idx)) {
      paths.add(prefix)
    }
  }
  return [...paths].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
}

/** Build a site URL for an index path (encodes each segment for spaces, Unicode, etc.). */
export function indexPathToHref(base: string, indexPath: string): string {
  const normalized = normalizeIndexPath(indexPath)
  if (!normalized) return \`\${base}index/\`
  const encoded = normalized.split('/').map(encodeURIComponent).join('/')
  return \`\${base}index/\${encoded}/\`
}
`
}

function indexRegistryLibSource(): string {
  return `import indexRegistryFile from '../../config/index-registry.json'
import { normalizeIndexPath, indexPathPrefixes } from './index-path'

export interface IndexRegistryEntry {
  path: string
  label?: string
  description?: string
}

export function loadIndexRegistryEntries(): IndexRegistryEntry[] {
  const raw = indexRegistryFile as { contractVersion?: number; entries?: IndexRegistryEntry[] }
  if (raw.contractVersion !== 1 || !Array.isArray(raw.entries)) return []
  const seen = new Set<string>()
  const out: IndexRegistryEntry[] = []
  for (const item of raw.entries) {
    if (!item || typeof item.path !== 'string') continue
    const path = normalizeIndexPath(item.path)
    if (!path || seen.has(path)) continue
    seen.add(path)
    const entry: IndexRegistryEntry = { path }
    if (typeof item.label === 'string' && item.label.trim()) entry.label = item.label.trim()
    if (typeof item.description === 'string' && item.description.trim()) {
      entry.description = item.description.trim()
    }
    out.push(entry)
  }
  return out.sort((a, b) => a.path.localeCompare(b.path, undefined, { sensitivity: 'base' }))
}

export function collectRegistryNavPaths(entries: IndexRegistryEntry[]): string[] {
  const paths = new Set<string>()
  for (const entry of entries) {
    for (const prefix of indexPathPrefixes(entry.path)) {
      paths.add(prefix)
    }
  }
  return [...paths].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
}

export function labelForIndexPath(path: string, entries: IndexRegistryEntry[]): string {
  const hit = entries.find((e) => e.path === path)
  if (hit?.label) return hit.label
  const parts = path.split('/')
  return parts[parts.length - 1] ?? path
}
`
}

function indexNavAstro(lang: 'ko' | 'en'): string {
  const title = lang === 'ko' ? '색인' : 'Index'
  const allTopics = lang === 'ko' ? '전체 주제' : 'All topics'
  return `---
import type { CollectionEntry } from 'astro:content'
import { collectIndexPathsFromEntries, indexPathToHref } from '../lib/index-path'
import { collectRegistryNavPaths, labelForIndexPath, loadIndexRegistryEntries } from '../lib/index-registry'

interface Props {
  entries: CollectionEntry<'knowledge'>[]
  activePath?: string
  variant?: 'sidebar' | 'inline'
}

const { entries, activePath = '', variant = 'sidebar' } = Astro.props
const registry = loadIndexRegistryEntries()
const fromEntries = collectIndexPathsFromEntries(entries)
const paths = [...new Set([...collectRegistryNavPaths(registry), ...fromEntries])].sort((a, b) =>
  a.localeCompare(b, undefined, { sensitivity: 'base' })
)
const base = import.meta.env.BASE_URL
const hub = \`\${base}index/\`
const navClass =
  variant === 'inline'
    ? '${EpDictionaryClasses.IndexNav} ${EpDictionaryClasses.IndexNavInline}'
    : '${EpDictionaryClasses.IndexNav}'

function depth(path: string): number {
  return Math.max(0, path.split('/').length - 1)
}
---

<nav class={navClass} aria-label="${title}">
  <h2 class="${EpDictionaryClasses.IndexNavTitle}">${title}</h2>
  <ul class="${EpDictionaryClasses.IndexNavTree}">
    <li class="${EpDictionaryClasses.IndexNavItem}">
      <a
        class="${EpDictionaryClasses.IndexNavLink}"
        href={hub}
        aria-current={activePath === '' ? 'page' : undefined}
      >${allTopics}</a>
    </li>
    {paths.map((path) => (
      <li
        class="${EpDictionaryClasses.IndexNavItem}"
        style={\`padding-left: \${depth(path) * 0.65}rem\`}
      >
        <a
          class="${EpDictionaryClasses.IndexNavLink}"
          href={indexPathToHref(base, path)}
          aria-current={activePath === path ? 'page' : undefined}
        >{labelForIndexPath(path, registry)}</a>
      </li>
    ))}
  </ul>
</nav>
`
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
  class="${EpDictionaryClasses.ThemeToggle}"
  role="group"
  aria-label="${label}"
  data-ep-theme-toggle
  data-default-mode={defaultMode}
>
  <button type="button" class="${EpDictionaryClasses.ThemeToggleBtn}" data-ep-theme-mode="system" aria-pressed="false">
    ${system}
  </button>
  <button type="button" class="${EpDictionaryClasses.ThemeToggleBtn}" data-ep-theme-mode="light" aria-pressed="false">
    ${light}
  </button>
  <button type="button" class="${EpDictionaryClasses.ThemeToggleBtn}" data-ep-theme-mode="dark" aria-pressed="false">
    ${dark}
  </button>
</div>

<script>
  const root = document.documentElement
  const group = document.querySelector('[data-ep-theme-toggle]')
  if (!group) throw new Error('Theme toggle missing')

  const storageKey = 'ep-dictionary-color-mode'
  const defaultMode = group.getAttribute('data-default-mode') || 'system'
  const buttons = group.querySelectorAll('[data-ep-theme-mode]')

  function readStored() {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
    } catch {
      /* ignore */
    }
    return defaultMode
  }

  function apply(mode) {
    root.setAttribute('data-ep-color-mode', mode)
    try {
      localStorage.setItem(storageKey, mode)
    } catch {
      /* ignore */
    }
    buttons.forEach((btn) => {
      const active = btn.getAttribute('data-ep-theme-mode') === mode
      btn.setAttribute('aria-pressed', active ? 'true' : 'false')
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

function headerAstro(lang: 'ko' | 'en'): string {
  return `---
import { SITE_TITLE, SITE_DESCRIPTION } from '../lib/site'
import ThemeToggle from './ThemeToggle.astro'

interface Props {
  current?: 'home' | 'archive' | 'index' | 'tags'
}

const { current } = Astro.props
---

<header class="${EpDictionaryClasses.Header}">
  <div class="${EpDictionaryClasses.HeaderInner} ${EpDictionaryClasses.Wide}">
    <div>
      <a class="${EpDictionaryClasses.HeaderBrand}" href={\`\${import.meta.env.BASE_URL}\`}>{SITE_TITLE}</a>
      <p class="${EpDictionaryClasses.HeaderTagline}">{SITE_DESCRIPTION}</p>
    </div>
    <div class="${EpDictionaryClasses.HeaderTools}">
      <ThemeToggle />
      <nav class="${EpDictionaryClasses.HeaderNav}" aria-label="${lang === 'ko' ? '주요 메뉴' : 'Primary'}">
      <a href={\`\${import.meta.env.BASE_URL}\`} aria-current={current === 'home' ? 'page' : undefined}>
        ${lang === 'ko' ? '홈' : 'Home'}
      </a>
      <a href={\`\${import.meta.env.BASE_URL}index/\`} aria-current={current === 'index' ? 'page' : undefined}>
        ${lang === 'ko' ? '색인' : 'Index'}
      </a>
      <a href={\`\${import.meta.env.BASE_URL}knowledge/\`} aria-current={current === 'archive' ? 'page' : undefined}>
        ${lang === 'ko' ? '전체 항목' : 'All entries'}
      </a>
      <a href={\`\${import.meta.env.BASE_URL}tags/\`} aria-current={current === 'tags' ? 'page' : undefined}>
        ${lang === 'ko' ? '태그' : 'Tags'}
      </a>
      </nav>
    </div>
  </div>
</header>
`
}

function footerAstro(lang: 'ko' | 'en'): string {
  return `---
import { SITE_TITLE } from '../lib/site'
const year = new Date().getFullYear()
---

<footer class="${EpDictionaryClasses.Footer}">
  <div class="${EpDictionaryClasses.FooterInner} ${EpDictionaryClasses.Wide}">
    <span>© {year} {SITE_TITLE}</span>
    <span>${lang === 'ko' ? 'Emprint로 발행됨' : 'Published with Emprint'}</span>
  </div>
</footer>
`
}

function postCardAstro(): string {
  return `---
import type { CollectionEntry } from 'astro:content'
import { formatDate } from '../lib/site'
import { indexPathToHref, normalizeIndexPath } from '../lib/index-path'

interface Props {
  post: CollectionEntry<'knowledge'>
  variant?: 'default' | 'featured' | 'compact'
}

const { post, variant = 'default' } = Astro.props
const date = post.data.updatedAt ?? post.data.createdAt
const base = import.meta.env.BASE_URL
const href = \`\${base}knowledge/\${encodeURIComponent(post.id)}/\`
const indexPath = normalizeIndexPath(String(post.data.index ?? ''))
const indexHref = indexPath ? indexPathToHref(base, indexPath) : null
const cardClass =
  variant === 'featured'
    ? \`${EpDictionaryClasses.KnowledgeCard} ${EpDictionaryClasses.KnowledgeCardFeatured}\`
    : variant === 'compact'
      ? \`${EpDictionaryClasses.KnowledgeCard} ${EpDictionaryClasses.KnowledgeCardCompact}\`
      : '${EpDictionaryClasses.KnowledgeCard}'
const showTags = variant !== 'compact'
const showDesc = variant === 'featured' || variant === 'default'
---

<li>
  {indexPath && indexHref ? (
    <a class="${EpDictionaryClasses.KnowledgeCardIndex}" href={indexHref}>
      {indexPath}
    </a>
  ) : null}
  <a class={cardClass} href={href}>
    <h3 class="${EpDictionaryClasses.KnowledgeCardTitle}">{post.data.title}</h3>
    <div class="${EpDictionaryClasses.KnowledgeCardMeta}">
      {date ? <span>{formatDate(date)}</span> : null}
      {showTags && post.data.tags.length > 0 ? (
        <>
          <span aria-hidden> · </span>
          <ul class="${EpDictionaryClasses.TagRow}" style="display:inline-flex;">
            {post.data.tags.slice(0, 4).map((t: string) => (
              <li><span class="${EpDictionaryClasses.Tag}">{t}</span></li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
    {showDesc && post.data.description ? (
      <p class="${EpDictionaryClasses.KnowledgeCardDesc}">{post.data.description}</p>
    ) : null}
  </a>
</li>
`
}

function dictionaryKnowledgeFeedAstro(): string {
  return `---
import type { CollectionEntry } from 'astro:content'
import themeFile from '../../config/theme.json'
import KnowledgeCard from './KnowledgeCard.astro'
import IndexNav from './IndexNav.astro'
import { formatDate, SITE_LANG } from '../lib/site'

type Composition = 'reference' | 'alphabet' | 'compact'

interface Props {
  posts: CollectionEntry<'knowledge'>[]
  /** Full collection for alphabet sidebar (tags / trending). Defaults to posts. */
  catalog?: CollectionEntry<'knowledge'>[]
  mode?: 'home' | 'archive'
}

function resolveComposition(raw: unknown): Composition {
  if (raw === 'alphabet' || raw === 'compact') return raw
  return 'reference'
}

function postTime(post: CollectionEntry<'knowledge'>): number {
  const d = post.data.updatedAt ?? post.data.createdAt
  return d ? d.getTime() : 0
}

function monthLabel(date: Date, lang: string): string {
  return date.toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US', { month: 'long' })
}

const { posts, catalog = posts, mode = 'archive' } = Astro.props
const composition = resolveComposition(themeFile.layoutComposition)
const lang = SITE_LANG

const sorted = [...posts].sort((a, b) => postTime(b) - postTime(a))

const tagCounts = new Map<string, number>()
for (const post of catalog) {
  for (const tag of post.data.tags) {
    tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1)
  }
}
const topTags = [...tagCounts.entries()]
  .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  .slice(0, 12)

const trending = [...catalog].sort((a, b) => postTime(b) - postTime(a)).slice(0, 5)

type CompactMonth = { key: string; label: string; posts: CollectionEntry<'knowledge'>[] }
type CompactYear = { year: number; months: CompactMonth[] }

const compactYears: CompactYear[] = []
if (composition === 'compact') {
  const byYear = new Map<number, Map<string, CompactMonth>>()
  for (const post of sorted) {
    const d = post.data.updatedAt ?? post.data.createdAt
    if (!d) continue
    const year = d.getFullYear()
    const monthKey = \`\${year}-\${String(d.getMonth() + 1).padStart(2, '0')}\`
    let yearMap = byYear.get(year)
    if (!yearMap) {
      yearMap = new Map()
      byYear.set(year, yearMap)
    }
    let bucket = yearMap.get(monthKey)
    if (!bucket) {
      bucket = { key: monthKey, label: monthLabel(d, lang), posts: [] }
      yearMap.set(monthKey, bucket)
    }
    bucket.posts.push(post)
  }
  for (const year of [...byYear.keys()].sort((a, b) => b - a)) {
    const months = [...(byYear.get(year)?.values() ?? [])].sort((a, b) => b.key.localeCompare(a.key))
    compactYears.push({ year, months })
  }
}

const featured = sorted[0]
const gridPosts = sorted.slice(1)
---

{composition === 'reference' ? (
  <ul class="${EpDictionaryClasses.PostList}">
    {sorted.map((post) => (
      <KnowledgeCard post={post} />
    ))}
  </ul>
) : null}

{composition === 'alphabet' ? (
  <div class="${EpDictionaryClasses.PostFeed}">
    <div class="${EpDictionaryClasses.PostFeedMain}">
      {featured ? (
        <div class="${EpDictionaryClasses.MagazineFeatured}">
          <KnowledgeCard post={featured} variant="featured" />
        </div>
      ) : null}
      {gridPosts.length > 0 ? (
        <ul class="${EpDictionaryClasses.PostList} ${EpDictionaryClasses.PostListGrid}">
          {gridPosts.map((post) => (
            <KnowledgeCard post={post} />
          ))}
        </ul>
      ) : null}
    </div>
    <aside class="${EpDictionaryClasses.PostFeedAside} ${EpDictionaryClasses.MagazineSidebar}" aria-label="Index">
      <IndexNav entries={catalog} variant="sidebar" />
    </aside>
  </div>
) : null}

{composition === 'compact' ? (
  <div class="${EpDictionaryClasses.Journal}">
    {compactYears.map(({ year, months }) => (
      <section class="${EpDictionaryClasses.JournalYear}">
        <h2 class="${EpDictionaryClasses.JournalYearLabel}">{year}</h2>
        {months.map((month) => (
          <div class="${EpDictionaryClasses.JournalMonth}">
            <h3 class="${EpDictionaryClasses.JournalMonthLabel}">{month.label}</h3>
            <ul class="${EpDictionaryClasses.JournalEntries}">
              {month.posts.map((post) => (
                <KnowledgeCard post={post} variant="compact" />
              ))}
            </ul>
          </div>
        ))}
      </section>
    ))}
  </div>
) : null}
`
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
  current?: 'home' | 'archive' | 'index' | 'tags'
}

const { title, description, current } = Astro.props
const fullTitle = title ? \`\${title} · \${SITE_TITLE}\` : SITE_TITLE
const meta = description ?? SITE_DESCRIPTION
const defaultColorMode =
  themeFile.colorMode === 'light' || themeFile.colorMode === 'dark' || themeFile.colorMode === 'system'
    ? themeFile.colorMode
    : 'system'
const layoutComposition =
  themeFile.layoutComposition === 'alphabet' ||
  themeFile.layoutComposition === 'compact' ||
  themeFile.layoutComposition === 'reference'
    ? themeFile.layoutComposition
    : 'reference'
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
        var k = 'ep-dictionary-color-mode'
        var m = defaultColorMode
        try {
          var s = localStorage.getItem(k)
          if (s === 'light' || s === 'dark' || s === 'system') m = s
        } catch (e) {}
        document.documentElement.setAttribute('data-ep-color-mode', m)
      })()
    </script>
    <slot name="head" />
  </head>
  <body>
    <LandingIntro />
    <div class="${EpDictionaryClasses.Site}">
      <Header current={current} />
      <main>
        <slot />
      </main>
      <Footer />
    </div>
  </body>
</html>
`
}

function postLayoutAstro(): string {
  return `---
import Layout from './Layout.astro'
import { formatDate } from '../lib/site'
import { indexPathToHref } from '../lib/index-path'

interface Props {
  title: string
  description?: string
  index?: string
  tags?: string[]
  createdAt?: Date
  updatedAt?: Date
}

const { title, description, index = '', tags = [], createdAt, updatedAt } = Astro.props
const date = updatedAt ?? createdAt
const base = import.meta.env.BASE_URL
---

<Layout title={title} description={description}>
  <article class="${EpDictionaryClasses.Container}">
    <header class="${EpDictionaryClasses.PostHeader}">
      {index ? (
        <p class="${EpDictionaryClasses.PostHeaderIndex}">
          <a href={indexPathToHref(base, index)}>{index}</a>
        </p>
      ) : null}
      <div class="${EpDictionaryClasses.PostHeaderMeta}">
        {date ? <span>{formatDate(date)}</span> : null}
        {tags.length > 0 ? (
          <ul class="${EpDictionaryClasses.TagRow}" style="display:inline-flex;">
            {tags.map((t: string) => (
              <li>
                <a class="${EpDictionaryClasses.Tag}" href={\`\${import.meta.env.BASE_URL}tags/\${encodeURIComponent(t)}/\`}>{t}</a>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <h1 class="${EpDictionaryClasses.PostHeaderTitle}">{title}</h1>
      {description ? <p class="${EpDictionaryClasses.PostHeaderDesc}">{description}</p> : null}
    </header>

    <div class="${EpDictionaryClasses.Prose}">
      <slot />
    </div>
  </article>
</Layout>
`
}
