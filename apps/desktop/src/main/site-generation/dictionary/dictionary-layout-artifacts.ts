import type { WorkspaceArtifact } from '@emprint/core'
import { dictionaryThemeToTokensCss } from '@emprint/shared'
import type { SiteGenerationContext } from '../site-project-generator'
import { createContentConfigArtifact } from '../content-config-artifacts'
import { EpDictionaryClasses } from './contract'
import {
  createDictionaryGlobalCss,
  createDictionaryThemeJson,
  createDefaultDictionaryTheme,
  loadComponentsCss
} from './dictionary-styles'
import { createDictionaryPageArtifacts } from './dictionary-page-artifacts'
import { createDictionaryPagefindScriptArtifact } from './dictionary-search-artifacts'
import syncThemeScript from './sync-theme.mjs?raw'
import { createLandingIntroArtifacts } from '../shared/landing-intro-artifacts'
import { footerAstroContent, sitePublicLibArtifact } from '../shared/footer-artifacts'

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
  'src/components/TopicGraph.astro',
  'src/components/AtlasGrid.astro',
  'src/lib/topic-graph.ts',
  'src/layouts/Layout.astro',
  'src/layouts/PostLayout.astro',
  'scripts/build-pagefind.mjs'
])

/** Astro shells updated when theme.json is saved (layout composition). */
export function getDictionaryLayoutTemplateSyncArtifacts(): WorkspaceArtifact[] {
  const lang = 'en'
  return createDictionaryComponentArtifacts(lang).filter((a) => DICTIONARY_TEMPLATE_SYNC_PATHS.has(a.relativePath))
}

/** Components, pages, and index helpers — refreshed on preview/theme sync for existing workspaces. */
export function getDictionarySiteTemplateArtifacts(locale: 'ko' | 'en' = 'en'): WorkspaceArtifact[] {
  return [
    createContentConfigArtifact('dictionary'),
    { relativePath: 'src/lib/index-path.ts', content: indexPathLibSource() },
    { relativePath: 'src/lib/index-registry.ts', content: indexRegistryLibSource() },
    { relativePath: 'src/lib/topic-graph.ts', content: topicGraphLibSource() },
    ...createDictionaryComponentArtifacts(locale),
    ...createDictionaryPageArtifacts(locale)
  ]
}

export function createDictionaryLayoutArtifacts(ctx: SiteGenerationContext): WorkspaceArtifact[] {
  const lang = ctx.locale === 'ko' ? 'ko' : 'en'
  const titleJson = JSON.stringify(ctx.title)
  const descriptionJson = JSON.stringify(ctx.description)

  return [
    ...createDictionaryThemeArtifacts(ctx),
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
    {
      relativePath: 'src/lib/topic-graph.ts',
      content: topicGraphLibSource()
    },
    ...createDictionaryComponentArtifacts(lang),
    ...createLandingIntroArtifacts('ep-dictionary'),
    createDictionaryPagefindScriptArtifact(),
    ...createDictionaryPageArtifacts(lang)
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
      relativePath: 'src/components/TopicGraph.astro',
      content: topicGraphAstro()
    },
    {
      relativePath: 'src/components/AtlasGrid.astro',
      content: atlasGridAstro()
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
  const normalized = normalizeIndexPath(path)
  if (!normalized) return path
  const hit = entries.find((e) => normalizeIndexPath(e.path) === normalized)
  if (hit?.label) return hit.label
  const parts = normalized.split('/')
  return parts[parts.length - 1] ?? normalized
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
  current?: 'home' | 'archive' | 'index' | 'tags' | 'search'
}

const { current } = Astro.props
---

<header class="${EpDictionaryClasses.Header}" data-pagefind-ignore>
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
      <a href={\`\${import.meta.env.BASE_URL}search/\`} aria-current={current === 'search' ? 'page' : undefined}>
        ${lang === 'ko' ? '검색' : 'Search'}
      </a>
      </nav>
    </div>
  </div>
</header>
`
}

function footerAstro(lang: 'ko' | 'en'): string {
  return footerAstroContent({
    footerClass: EpDictionaryClasses.Footer,
    footerInnerClass: EpDictionaryClasses.FooterInner,
    wideClass: EpDictionaryClasses.Wide,
    lang,
    publishedWithEmprint: true
  })
}

function postCardAstro(): string {
  return `---
import type { CollectionEntry } from 'astro:content'
import { formatDate } from '../lib/site'
import { indexPathToHref, normalizeIndexPath } from '../lib/index-path'
import { labelForIndexPath, loadIndexRegistryEntries } from '../lib/index-registry'

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
const registry = loadIndexRegistryEntries()
const indexLabel = indexPath ? labelForIndexPath(indexPath, registry) : ''
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
      {indexLabel}
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
import KnowledgeCard from './KnowledgeCard.astro'

interface Props {
  posts: CollectionEntry<'knowledge'>[]
  catalog?: CollectionEntry<'knowledge'>[]
  mode?: 'home' | 'archive'
}

function postTime(post: CollectionEntry<'knowledge'>): number {
  const d = post.data.updatedAt ?? post.data.createdAt
  return d ? d.getTime() : 0
}

const { posts } = Astro.props
const sorted = [...posts].sort((a, b) => postTime(b) - postTime(a))
---

<ul class="${EpDictionaryClasses.PostList}">
  {sorted.map((post) => (
    <KnowledgeCard post={post} />
  ))}
</ul>
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
  current?: 'home' | 'archive' | 'index' | 'tags' | 'search'
  /** When true, main content may be indexed by Pagefind (knowledge detail pages). */
  indexForSearch?: boolean
}

const { title, description, current, indexForSearch = false } = Astro.props
const fullTitle = title ? \`\${title} · \${SITE_TITLE}\` : SITE_TITLE
const meta = description ?? SITE_DESCRIPTION
const defaultColorMode =
  themeFile.colorMode === 'light' || themeFile.colorMode === 'dark' || themeFile.colorMode === 'system'
    ? themeFile.colorMode
    : 'system'
const layoutComposition =
  themeFile.layoutComposition === 'reference' ||
  themeFile.layoutComposition === 'graph' ||
  themeFile.layoutComposition === 'atlas'
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
      <main {...(!indexForSearch ? { 'data-pagefind-ignore': true } : {})}>
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
import { indexPathToHref, normalizeIndexPath } from '../lib/index-path'
import { labelForIndexPath, loadIndexRegistryEntries } from '../lib/index-registry'

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
const indexPath = normalizeIndexPath(index)
const registry = loadIndexRegistryEntries()
const indexLabel = indexPath ? labelForIndexPath(indexPath, registry) : ''
---

<Layout title={title} description={description} indexForSearch>
  <article
    class="${EpDictionaryClasses.Container}"
    data-pagefind-body
    {...(tags.length > 0
      ? { 'data-pagefind-meta': tags.map((t: string) => \`tag:\${t}\`).join(', ') }
      : {})}
  >
    <header class="${EpDictionaryClasses.PostHeader}">
      {indexPath ? (
        <p class="${EpDictionaryClasses.PostHeaderIndex}">
          <a href={indexPathToHref(base, indexPath)}>{indexLabel}</a>
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
      <h1 class="${EpDictionaryClasses.PostHeaderTitle}" data-pagefind-meta="title">{title}</h1>
      {description ? (
        <p class="${EpDictionaryClasses.PostHeaderDesc}" data-pagefind-meta="description">{description}</p>
      ) : null}
    </header>

    <div class="${EpDictionaryClasses.Prose}">
      <slot />
    </div>
  </article>
</Layout>
`
}

function topicGraphLibSource(): string {
  return `/** Build-time topic graph layout for Dictionary graph composition. */

import { indexPathPrefixes, normalizeIndexPath } from './index-path'
import { loadIndexRegistryEntries, labelForIndexPath } from './index-registry'

export type TopicGraphNodeKind = 'index' | 'entry'

export interface TopicGraphNode {
  id: string
  label: string
  kind: TopicGraphNodeKind
  href?: string
  x: number
  y: number
  r: number
}

export interface TopicGraphEdge {
  from: string
  to: string
  kind: 'index' | 'entry'
}

export interface TopicGraphLayout {
  width: number
  height: number
  nodes: TopicGraphNode[]
  edges: TopicGraphEdge[]
}

interface TopicGraphTreeLayout {
  nodes: TopicGraphNode[]
  edges: TopicGraphEdge[]
  width: number
  height: number
  rootY: number
}

interface TreeNode {
  path: string
  label: string
  children: TreeNode[]
  entries: Array<{ id: string; label: string; href: string }>
}

function buildTree(
  paths: Set<string>,
  entries: Array<{ id: string; title: string; href: string; index: string }>,
  registry: ReturnType<typeof loadIndexRegistryEntries>
): TreeNode[] {
  const nodeMap = new Map<string, TreeNode>()
  const ensure = (path: string): TreeNode => {
    let node = nodeMap.get(path)
    if (!node) {
      node = { path, label: labelForIndexPath(path, registry), children: [], entries: [] }
      nodeMap.set(path, node)
    }
    return node
  }
  for (const path of paths) {
    if (!path) continue
    for (const prefix of indexPathPrefixes(path)) ensure(prefix)
  }
  for (const entry of entries) {
    const idx = normalizeIndexPath(entry.index)
    if (!idx) continue
    for (const prefix of indexPathPrefixes(idx)) ensure(prefix)
    ensure(idx).entries.push({ id: entry.id, label: entry.title, href: entry.href })
  }
  const roots: TreeNode[] = []
  for (const node of nodeMap.values()) {
    const parts = node.path.split('/')
    if (parts.length === 1) roots.push(node)
    else {
      const parent = parts.slice(0, -1).join('/')
      ensure(parent).children.push(node)
    }
  }
  roots.sort((a, b) => a.path.localeCompare(b.path))
  for (const node of nodeMap.values()) {
    node.children.sort((a, b) => a.path.localeCompare(b.path))
  }
  return roots
}

const INDEX_LEVEL_GAP = 108
const ENTRY_LEVEL_GAP = 72
const SIBLING_GAP = 54
const NODE_R = 12
const NODE_R_ROOT = 17
const PAD = 52
const ROOT_CLUSTER_GAP = 56

function measureSubtreeWidth(node: TreeNode): number {
  const entrySpan =
    node.entries.length <= 1 ? NODE_R * 2 : (node.entries.length - 1) * SIBLING_GAP + NODE_R * 2
  let childSpan = NODE_R * 2
  if (node.children.length > 0) {
    const parts = node.children.map(measureSubtreeWidth)
    childSpan = parts.reduce((sum, width) => sum + width, 0) + (node.children.length - 1) * SIBLING_GAP
  }
  return Math.max(entrySpan, childSpan, NODE_R * 2)
}

function indexHref(baseUrl: string, path: string): string {
  return \`\${baseUrl}index/\${path.split('/').map(encodeURIComponent).join('/')}/\`
}

function layoutTree(root: TreeNode, baseUrl: string): TopicGraphTreeLayout {
  const nodes: TopicGraphNode[] = []
  const edges: TopicGraphEdge[] = []

  const walk = (node: TreeNode, x: number, y: number, depth: number, parentId?: string) => {
    const id = \`index:\${node.path}\`
    nodes.push({
      id,
      label: node.label,
      kind: 'index',
      href: indexHref(baseUrl, node.path),
      x,
      y,
      r: depth === 0 ? NODE_R_ROOT : NODE_R
    })
    if (parentId) edges.push({ from: parentId, to: id, kind: 'index' })

    if (node.entries.length > 0) {
      const entryY = y + ENTRY_LEVEL_GAP
      const span = node.entries.length <= 1 ? 0 : (node.entries.length - 1) * SIBLING_GAP
      node.entries.forEach((entry, index) => {
        const entryX = x - span / 2 + index * SIBLING_GAP
        const entryId = \`entry:\${entry.id}\`
        nodes.push({
          id: entryId,
          label: entry.label,
          kind: 'entry',
          href: entry.href,
          x: entryX,
          y: entryY,
          r: NODE_R
        })
        edges.push({ from: id, to: entryId, kind: 'entry' })
      })
    }

    if (node.children.length > 0) {
      const childY = y - INDEX_LEVEL_GAP
      const widths = node.children.map(measureSubtreeWidth)
      const totalSpan = widths.reduce((sum, width) => sum + width, 0) + (node.children.length - 1) * SIBLING_GAP
      let cursor = x - totalSpan / 2
      node.children.forEach((child, index) => {
        const width = widths[index] ?? NODE_R * 2
        const childX = cursor + width / 2
        walk(child, childX, childY, depth + 1, id)
        cursor += width + SIBLING_GAP
      })
    }
  }

  walk(root, 0, 0, 0)

  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const node of nodes) {
    minX = Math.min(minX, node.x - node.r)
    maxX = Math.max(maxX, node.x + node.r)
    minY = Math.min(minY, node.y - node.r)
    maxY = Math.max(maxY, node.y + node.r)
  }
  const offsetX = PAD - minX
  const offsetY = PAD - minY
  for (const node of nodes) {
    node.x += offsetX
    node.y += offsetY
  }

  const rootId = \`index:\${root.path}\`
  const rootNode = nodes.find((node) => node.id === rootId)

  return {
    nodes,
    edges,
    width: maxX - minX + PAD * 2,
    height: maxY - minY + PAD * 2,
    rootY: rootNode?.y ?? PAD
  }
}

export function buildTopicGraph(
  entries: Array<{ id: string; data: { title: string; index?: string } }>,
  baseUrl: string
): TopicGraphLayout {
  const registry = loadIndexRegistryEntries()
  const paths = new Set<string>()
  for (const row of registry) paths.add(row.path)
  const flatEntries = entries.map((entry) => ({
    id: entry.id,
    title: entry.data.title,
    href: \`\${baseUrl}knowledge/\${entry.id}/\`,
    index: normalizeIndexPath(String(entry.data.index ?? ''))
  }))
  for (const entry of flatEntries) {
    if (!entry.index) continue
    for (const prefix of indexPathPrefixes(entry.index)) paths.add(prefix)
  }
  const roots = buildTree(paths, flatEntries, registry)
  if (roots.length === 0) {
    return { width: 340, height: 280, nodes: [], edges: [] }
  }

  const trees = roots.map((root) => layoutTree(root, baseUrl))
  const rootYTarget = Math.max(...trees.map((tree) => tree.rootY))
  const nodes: TopicGraphNode[] = []
  const edges: TopicGraphEdge[] = []
  let offsetX = 0
  let maxRight = 0
  let maxBottom = 0

  for (const tree of trees) {
    const yShift = rootYTarget - tree.rootY
    for (const node of tree.nodes) {
      const placed = { ...node, x: node.x + offsetX, y: node.y + yShift }
      nodes.push(placed)
      maxRight = Math.max(maxRight, placed.x + placed.r)
      maxBottom = Math.max(maxBottom, placed.y + placed.r)
    }
    edges.push(...tree.edges)
    offsetX += tree.width + ROOT_CLUSTER_GAP
  }

  return {
    width: Math.max(340, maxRight + PAD),
    height: Math.max(280, maxBottom + PAD),
    nodes,
    edges
  }
}

/** Edge endpoints on node circumferences (not center-to-center). */
export function topicGraphEdgePoints(
  from: Pick<TopicGraphNode, 'x' | 'y' | 'r'>,
  to: Pick<TopicGraphNode, 'x' | 'y' | 'r'>
): { x1: number; y1: number; x2: number; y2: number } {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const dist = Math.hypot(dx, dy)
  if (dist <= from.r + to.r || dist === 0) {
    return { x1: from.x, y1: from.y, x2: to.x, y2: to.y }
  }
  const ux = dx / dist
  const uy = dy / dist
  return {
    x1: from.x + ux * from.r,
    y1: from.y + uy * from.r,
    x2: to.x - ux * to.r,
    y2: to.y - uy * to.r
  }
}
`
}

function topicGraphAstro(): string {
  const C = EpDictionaryClasses
  return `---
import type { CollectionEntry } from 'astro:content'
import { buildTopicGraph, topicGraphEdgePoints } from '../lib/topic-graph'

interface Props {
  entries: CollectionEntry<'knowledge'>[]
}

const { entries } = Astro.props
const base = import.meta.env.BASE_URL
const graph = buildTopicGraph(entries, base)
---

<section class="${C.TopicGraph}" aria-label="Topic graph">
  <svg
    class="${C.TopicGraphSvg}"
    viewBox={\`0 0 \${graph.width} \${graph.height}\`}
    role="img"
    aria-label="Topic graph"
  >
    {graph.edges.map((edge) => {
      const from = graph.nodes.find((n) => n.id === edge.from)
      const to = graph.nodes.find((n) => n.id === edge.to)
      if (!from || !to) return null
      const pts = topicGraphEdgePoints(from, to)
      return (
        <line
          class={
            edge.kind === 'entry'
              ? '${C.TopicGraphEdge} ${C.TopicGraphEdgeEntry}'
              : '${C.TopicGraphEdge} ${C.TopicGraphEdgeIndex}'
          }
          x1={pts.x1}
          y1={pts.y1}
          x2={pts.x2}
          y2={pts.y2}
        />
      )
    })}
    {graph.nodes.map((node) => {
      const tip = node.label.length > 48 ? \`\${node.label.slice(0, 46)}…\` : node.label
      const tipW = Math.min(176, Math.max(44, tip.length * 6.4 + 14))
      const tipH = 20
      const tipX = node.x - tipW / 2
      const tipY = node.y - node.r - tipH - 8
      return (
        <g
          class={
            node.kind === 'index'
              ? '${C.TopicGraphNode} ${C.TopicGraphNodeIndex}'
              : '${C.TopicGraphNode} ${C.TopicGraphNodeEntry}'
          }
        >
          <a href={node.href} aria-label={node.label}>
            <circle cx={node.x} cy={node.y} r={node.r} />
            <title>{node.label}</title>
            <g class="${C.TopicGraphTooltip}">
              <rect
                class="${C.TopicGraphTooltipBg}"
                x={tipX}
                y={tipY}
                width={tipW}
                height={tipH}
                rx={4}
              />
              <text
                class="${C.TopicGraphTooltipText}"
                x={node.x}
                y={tipY + tipH - 6}
                text-anchor="middle"
              >
                {tip}
              </text>
            </g>
          </a>
        </g>
      )
    })}
  </svg>
</section>
`
}

function atlasGridAstro(): string {
  const C = EpDictionaryClasses
  return `---
import type { CollectionEntry } from 'astro:content'
import { indexPathToHref, indexPathPrefixes, normalizeIndexPath } from '../lib/index-path'
import { labelForIndexPath, loadIndexRegistryEntries } from '../lib/index-registry'

interface Props {
  entries: CollectionEntry<'knowledge'>[]
}

const { entries } = Astro.props
const registry = loadIndexRegistryEntries()
const base = import.meta.env.BASE_URL
const counts = new Map<string, number>()
for (const row of registry) {
  const root = row.path.split('/')[0]
  if (root) counts.set(root, counts.get(root) ?? 0)
}
for (const entry of entries) {
  const idx = normalizeIndexPath(String(entry.data.index ?? ''))
  const root = indexPathPrefixes(idx)[0]
  if (!root) continue
  counts.set(root, (counts.get(root) ?? 0) + 1)
}
const topics = [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]))
---

<section class="${C.AtlasGrid}" aria-label="Topic atlas">
  {topics.map(([path, count]) => (
    <a class="${C.AtlasTile}" href={indexPathToHref(base, path)}>
      <h3 class="${C.AtlasTileTitle}">{labelForIndexPath(path, registry)}</h3>
      <p class="${C.AtlasTileMeta}">{count} {count === 1 ? 'entry' : 'entries'}</p>
    </a>
  ))}
</section>
`
}
