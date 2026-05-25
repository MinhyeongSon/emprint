import type { WorkspaceArtifact } from '@emprint/core'
import type { SiteGenerationContext } from '../site-project-generator'
import { EpColumnClasses } from './contract'
import {
  createColumnGlobalCss,
  createColumnThemeJson,
  createDefaultColumnTheme,
  loadComponentsCss
} from './column-styles'
import { columnThemeToTokensCss } from '@emprint/shared'
import { createColumnPageArtifacts } from './column-page-artifacts'
import syncThemeScript from './sync-theme.mjs?raw'
import { createLandingIntroArtifacts } from '../shared/landing-intro-artifacts'
import { footerAstroContent, sitePublicLibArtifact } from '../shared/footer-artifacts'

export function createColumnThemeArtifacts(ctx: SiteGenerationContext): WorkspaceArtifact[] {
  const theme = createDefaultColumnTheme(ctx)
  return [
    { relativePath: 'config/theme.json', content: createColumnThemeJson(ctx) },
    { relativePath: 'src/styles/tokens.css', content: columnThemeToTokensCss(theme) },
    { relativePath: 'src/styles/components.css', content: loadComponentsCss() },
    { relativePath: 'src/styles/global.css', content: createColumnGlobalCss() },
    {
      relativePath: 'scripts/sync-theme.mjs',
      content: syncThemeScript
    }
  ]
}

const COLUMN_TEMPLATE_SYNC_PATHS = new Set([
  'src/components/PostCard.astro',
  'src/components/ColumnPostFeed.astro',
  'src/layouts/Layout.astro'
])

/** Astro shells updated when theme.json is saved (layout composition). */
export function getColumnLayoutTemplateSyncArtifacts(): WorkspaceArtifact[] {
  const lang = 'en'
  return createColumnComponentArtifacts(lang).filter((a) => COLUMN_TEMPLATE_SYNC_PATHS.has(a.relativePath))
}

export function createColumnLayoutArtifacts(ctx: SiteGenerationContext): WorkspaceArtifact[] {
  const lang = ctx.locale === 'ko' ? 'ko' : 'en'
  const titleJson = JSON.stringify(ctx.title)
  const descriptionJson = JSON.stringify(ctx.description)

  return [
    ...createColumnThemeArtifacts(ctx),
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
    ...createColumnComponentArtifacts(lang),
    ...createLandingIntroArtifacts('ep-column'),
    ...createColumnPageArtifacts()
  ]
}

function createColumnComponentArtifacts(lang: 'ko' | 'en'): WorkspaceArtifact[] {
  return [
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
      relativePath: 'src/components/PostCard.astro',
      content: postCardAstro()
    },
    {
      relativePath: 'src/components/ColumnPostFeed.astro',
      content: columnPostFeedAstro()
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
  class="${EpColumnClasses.ThemeToggle}"
  role="group"
  aria-label="${label}"
  data-ep-theme-toggle
  data-default-mode={defaultMode}
>
  <button type="button" class="${EpColumnClasses.ThemeToggleBtn}" data-ep-theme-mode="system" aria-pressed="false">
    ${system}
  </button>
  <button type="button" class="${EpColumnClasses.ThemeToggleBtn}" data-ep-theme-mode="light" aria-pressed="false">
    ${light}
  </button>
  <button type="button" class="${EpColumnClasses.ThemeToggleBtn}" data-ep-theme-mode="dark" aria-pressed="false">
    ${dark}
  </button>
</div>

<script>
  const root = document.documentElement
  const group = document.querySelector('[data-ep-theme-toggle]')
  if (!group) throw new Error('Theme toggle missing')

  const storageKey = 'ep-column-color-mode'
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
  current?: 'home' | 'archive' | 'tags'
}

const { current } = Astro.props
---

<header class="${EpColumnClasses.Header}">
  <div class="${EpColumnClasses.HeaderInner} ${EpColumnClasses.Wide}">
    <div>
      <a class="${EpColumnClasses.HeaderBrand}" href={\`\${import.meta.env.BASE_URL}\`}>{SITE_TITLE}</a>
      <p class="${EpColumnClasses.HeaderTagline}">{SITE_DESCRIPTION}</p>
    </div>
    <div class="${EpColumnClasses.HeaderTools}">
      <ThemeToggle />
      <nav class="${EpColumnClasses.HeaderNav}" aria-label="${lang === 'ko' ? '주요 메뉴' : 'Primary'}">
      <a href={\`\${import.meta.env.BASE_URL}\`} aria-current={current === 'home' ? 'page' : undefined}>
        ${lang === 'ko' ? '홈' : 'Home'}
      </a>
      <a href={\`\${import.meta.env.BASE_URL}posts/\`} aria-current={current === 'archive' ? 'page' : undefined}>
        ${lang === 'ko' ? '아카이브' : 'Archive'}
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
  return footerAstroContent({
    footerClass: EpColumnClasses.Footer,
    footerInnerClass: EpColumnClasses.FooterInner,
    wideClass: EpColumnClasses.Wide,
    lang,
    publishedWithEmprint: true
  })
}

function postCardAstro(): string {
  return `---
import type { CollectionEntry } from 'astro:content'
import { formatDate } from '../lib/site'

interface Props {
  post: CollectionEntry<'posts'>
  variant?: 'default' | 'featured' | 'compact'
}

const { post, variant = 'default' } = Astro.props
const date = post.data.updatedAt ?? post.data.createdAt
const href = \`\${import.meta.env.BASE_URL}posts/\${post.id}/\`
const cardClass =
  variant === 'featured'
    ? \`${EpColumnClasses.PostCard} ${EpColumnClasses.PostCardFeatured}\`
    : variant === 'compact'
      ? \`${EpColumnClasses.PostCard} ${EpColumnClasses.PostCardCompact}\`
      : '${EpColumnClasses.PostCard}'
const showTags = variant !== 'compact'
const showDesc = variant === 'featured' || variant === 'default'
---

<li>
  <a class={cardClass} href={href}>
    <h3 class="${EpColumnClasses.PostCardTitle}">{post.data.title}</h3>
    <div class="${EpColumnClasses.PostCardMeta}">
      {date ? <span>{formatDate(date)}</span> : null}
      {showTags && post.data.tags.length > 0 ? (
        <>
          <span aria-hidden> · </span>
          <ul class="${EpColumnClasses.TagRow}" style="display:inline-flex;">
            {post.data.tags.slice(0, 4).map((t: string) => (
              <li><span class="${EpColumnClasses.Tag}">{t}</span></li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
    {showDesc && post.data.description ? (
      <p class="${EpColumnClasses.PostCardDesc}">{post.data.description}</p>
    ) : null}
  </a>
</li>
`
}

function columnPostFeedAstro(): string {
  return `---
import type { CollectionEntry } from 'astro:content'
import themeFile from '../../config/theme.json'
import PostCard from './PostCard.astro'
import { formatDate, SITE_LANG } from '../lib/site'

type Composition = 'readingRoom' | 'magazine' | 'journal'

interface Props {
  posts: CollectionEntry<'posts'>[]
  /** Full collection for magazine sidebar (tags / trending). Defaults to posts. */
  catalog?: CollectionEntry<'posts'>[]
  mode?: 'home' | 'archive'
}

function resolveComposition(raw: unknown): Composition {
  if (raw === 'magazine' || raw === 'journal') return raw
  return 'readingRoom'
}

function postTime(post: CollectionEntry<'posts'>): number {
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

type JournalMonth = { key: string; label: string; posts: CollectionEntry<'posts'>[] }
type JournalYear = { year: number; months: JournalMonth[] }

const journalYears: JournalYear[] = []
if (composition === 'journal') {
  const byYear = new Map<number, Map<string, JournalMonth>>()
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
    journalYears.push({ year, months })
  }
}

const featured = sorted[0]
const gridPosts = sorted.slice(1)
---

{composition === 'readingRoom' ? (
  <ul class="${EpColumnClasses.PostList}">
    {sorted.map((post) => (
      <PostCard post={post} />
    ))}
  </ul>
) : null}

{composition === 'magazine' ? (
  <div class="${EpColumnClasses.PostFeed}">
    <div class="${EpColumnClasses.PostFeedMain}">
      {featured ? (
        <div class="${EpColumnClasses.MagazineFeatured}">
          <PostCard post={featured} variant="featured" />
        </div>
      ) : null}
      {gridPosts.length > 0 ? (
        <ul class="${EpColumnClasses.PostList} ${EpColumnClasses.PostListGrid}">
          {gridPosts.map((post) => (
            <PostCard post={post} />
          ))}
        </ul>
      ) : null}
    </div>
    <aside class="${EpColumnClasses.PostFeedAside} ${EpColumnClasses.MagazineSidebar}" aria-label="Sidebar">
      <section class="${EpColumnClasses.MagazineSidebarBlock}">
        <h3 class="${EpColumnClasses.MagazineSidebarTitle}">Trending</h3>
        <ol class="${EpColumnClasses.MagazineTrendingList}">
          {trending.map((post) => {
            const date = post.data.updatedAt ?? post.data.createdAt
            const href = \`\${import.meta.env.BASE_URL}posts/\${post.id}/\`
            return (
              <li class="${EpColumnClasses.MagazineTrendingItem}">
                <a href={href}>
                  <span>{post.data.title}</span>
                  {date ? <time datetime={date.toISOString()}>{formatDate(date)}</time> : null}
                </a>
              </li>
            )
          })}
        </ol>
      </section>
      {topTags.length > 0 ? (
        <section class="${EpColumnClasses.MagazineSidebarBlock}">
          <h3 class="${EpColumnClasses.MagazineSidebarTitle}">Tags</h3>
          <ul class="${EpColumnClasses.TagRow}">
            {topTags.map(([tag, count]) => (
              <li>
                <a
                  class="${EpColumnClasses.Tag}"
                  href={\`\${import.meta.env.BASE_URL}tags/\${encodeURIComponent(tag)}/\`}
                >
                  {tag} · {count}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </aside>
  </div>
) : null}

{composition === 'journal' ? (
  <div class="${EpColumnClasses.Journal}">
    {journalYears.map(({ year, months }) => (
      <section class="${EpColumnClasses.JournalYear}">
        <h2 class="${EpColumnClasses.JournalYearLabel}">{year}</h2>
        {months.map((month) => (
          <div class="${EpColumnClasses.JournalMonth}">
            <h3 class="${EpColumnClasses.JournalMonthLabel}">{month.label}</h3>
            <ul class="${EpColumnClasses.JournalEntries}">
              {month.posts.map((post) => (
                <PostCard post={post} variant="compact" />
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
  current?: 'home' | 'archive' | 'tags'
}

const { title, description, current } = Astro.props
const fullTitle = title ? \`\${title} · \${SITE_TITLE}\` : SITE_TITLE
const meta = description ?? SITE_DESCRIPTION
const defaultColorMode =
  themeFile.colorMode === 'light' || themeFile.colorMode === 'dark' || themeFile.colorMode === 'system'
    ? themeFile.colorMode
    : 'system'
const layoutComposition =
  themeFile.layoutComposition === 'magazine' ||
  themeFile.layoutComposition === 'journal' ||
  themeFile.layoutComposition === 'readingRoom'
    ? themeFile.layoutComposition
    : 'readingRoom'
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
        var k = 'ep-column-color-mode'
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
    <div class="${EpColumnClasses.Site}">
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

interface Props {
  title: string
  description?: string
  tags?: string[]
  createdAt?: Date
  updatedAt?: Date
}

const { title, description, tags = [], createdAt, updatedAt } = Astro.props
const date = updatedAt ?? createdAt
---

<Layout title={title} description={description}>
  <article class="${EpColumnClasses.Container}">
    <header class="${EpColumnClasses.PostHeader}">
      <div class="${EpColumnClasses.PostHeaderMeta}">
        {date ? <span>{formatDate(date)}</span> : null}
        {tags.length > 0 ? (
          <ul class="${EpColumnClasses.TagRow}" style="display:inline-flex;">
            {tags.map((t: string) => (
              <li>
                <a class="${EpColumnClasses.Tag}" href={\`\${import.meta.env.BASE_URL}tags/\${encodeURIComponent(t)}/\`}>{t}</a>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <h1 class="${EpColumnClasses.PostHeaderTitle}">{title}</h1>
      {description ? <p class="${EpColumnClasses.PostHeaderDesc}">{description}</p> : null}
    </header>

    <div class="${EpColumnClasses.Prose}">
      <slot />
    </div>
  </article>
</Layout>
`
}
