import type { WorkspaceArtifact } from '@emprint/core'
import type { SiteGenerationContext } from '../site-project-generator'
import { EpFragmentsClasses } from './contract'
import {
  createFragmentsGlobalCss,
  createFragmentsThemeJson,
  createDefaultFragmentsTheme,
  loadComponentsCss
} from './fragments-styles'
import { fragmentsThemeToTokensCss } from '@emprint/shared'
import { createFragmentsPageArtifacts, getFragmentsPageTemplateSyncArtifacts } from './fragments-page-artifacts'
import syncThemeScript from './sync-theme.mjs?raw'
import { createLandingIntroArtifacts } from '../shared/landing-intro-artifacts'
import { footerAstroContent, sitePublicLibArtifact } from '../shared/footer-artifacts'

export function createFragmentsThemeArtifacts(ctx: SiteGenerationContext): WorkspaceArtifact[] {
  const theme = createDefaultFragmentsTheme(ctx)
  return [
    { relativePath: 'config/theme.json', content: createFragmentsThemeJson(ctx) },
    { relativePath: 'src/styles/tokens.css', content: fragmentsThemeToTokensCss(theme) },
    { relativePath: 'src/styles/components.css', content: loadComponentsCss() },
    { relativePath: 'src/styles/global.css', content: createFragmentsGlobalCss() },
    { relativePath: 'scripts/sync-theme.mjs', content: syncThemeScript }
  ]
}

const FRAGMENTS_TEMPLATE_SYNC_PATHS = new Set([
  'src/components/Header.astro',
  'src/components/Footer.astro',
  'src/components/LpShelf.astro',
  'src/components/GalleryMasonry.astro',
  'src/pages/index.astro',
  'src/layouts/Layout.astro',
  'src/lib/site-public.ts'
])

export function getFragmentsLayoutTemplateSyncArtifacts(): WorkspaceArtifact[] {
  const lang = 'en'
  return createFragmentsComponentArtifacts(lang).filter((a) =>
    FRAGMENTS_TEMPLATE_SYNC_PATHS.has(a.relativePath)
  )
}

export function getFragmentsSiteTemplateArtifacts(locale: 'ko' | 'en' = 'en'): WorkspaceArtifact[] {
  return [...createFragmentsComponentArtifacts(locale), ...createFragmentsPageArtifacts()]
}

export function createFragmentsLayoutArtifacts(ctx: SiteGenerationContext): WorkspaceArtifact[] {
  const lang = ctx.locale === 'ko' ? 'ko' : 'en'
  const titleJson = JSON.stringify(ctx.title)
  const descriptionJson = JSON.stringify(ctx.description)

  return [
    ...createFragmentsThemeArtifacts(ctx),
    sitePublicLibArtifact(),
    {
      relativePath: 'src/lib/site.ts',
      content: `import siteConfig from '../../config/site.json'

export const SITE_TITLE = (siteConfig as { title?: string }).title || ${titleJson}
export const SITE_DESCRIPTION = (siteConfig as { description?: string }).description || ${descriptionJson}
export const SITE_LANG = '${lang}'
`
    },
    ...createFragmentsComponentArtifacts(lang),
    ...createLandingIntroArtifacts('ep-fragments'),
    ...createFragmentsPageArtifacts()
  ]
}

function createFragmentsComponentArtifacts(lang: 'ko' | 'en'): WorkspaceArtifact[] {
  const EP = EpFragmentsClasses
  return [
    {
      relativePath: 'src/components/ThemeToggle.astro',
      content: themeToggleAstro(EP)
    },
    {
      relativePath: 'src/components/Header.astro',
      content: fragmentsHeaderAstro(EP, lang)
    },
    {
      relativePath: 'src/components/Footer.astro',
      content: footerAstroContent({
        footerClass: EP.Footer,
        footerInnerClass: EP.FooterInner,
        mutedClass: EP.Muted,
        lang
      })
    },
    {
      relativePath: 'src/layouts/Layout.astro',
      content: layoutAstro(EP, lang)
    },
    {
      relativePath: 'src/components/LpShelf.astro',
      content: lpShelfAstro(EP, lang)
    },
    {
      relativePath: 'src/components/GalleryMasonry.astro',
      content: galleryMasonryAstro(EP, lang)
    }
  ]
}

function fragmentsHeaderAstro(EP: typeof EpFragmentsClasses, lang: 'ko' | 'en'): string {
  const navShelfLabel = lang === 'ko' ? '선반' : 'Shelf'
  const navAria = lang === 'ko' ? '주요 메뉴' : 'Primary'
  return `---
import { SITE_TITLE } from '../lib/site'
import ThemeToggle from './ThemeToggle.astro'
import themeFile from '../../config/theme.json'
import { resolveLandingIntroFromTheme } from '../lib/landing-intro'

const base = import.meta.env.BASE_URL
const intro = resolveLandingIntroFromTheme(themeFile as Record<string, unknown>)
const navShelfLabel = '${navShelfLabel}'
const navUseScript = intro.variant === 'script'
---
{navUseScript ? (
  <link
    rel="stylesheet"
    href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;600&display=swap"
  />
) : null}
<header class="${EP.Header}">
  <div class="${EP.HeaderInner}">
    <a class="${EP.HeaderBrand}" href={base}>{SITE_TITLE}</a>
    <nav class="${EP.HeaderNav}" aria-label="${navAria}">
      <a href={base} class={navUseScript ? '${EP.HeaderNav}-script' : undefined}>{navShelfLabel}</a>
    </nav>
    <div class="${EP.HeaderTools}">
      <ThemeToggle />
    </div>
  </div>
</header>
`
}

function themeToggleAstro(EP: typeof EpFragmentsClasses): string {
  return `---
import themeFile from '../../config/theme.json'
const defaultMode = themeFile.colorMode ?? 'system'
---
<div class="${EP.ThemeToggle}" data-ep-theme-toggle data-default={defaultMode}>
  <button type="button" class="${EP.ThemeToggleBtn}" data-mode="system" aria-label="System">◇</button>
  <button type="button" class="${EP.ThemeToggleBtn}" data-mode="light" aria-label="Light">☀</button>
  <button type="button" class="${EP.ThemeToggleBtn}" data-mode="dark" aria-label="Dark">☾</button>
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

function layoutAstro(EP: typeof EpFragmentsClasses, lang: 'ko' | 'en'): string {
  return `---
import '../styles/global.css'
import Header from '../components/Header.astro'
import Footer from '../components/Footer.astro'
import LandingIntro from '../components/LandingIntro.astro'
import themeFile from '../../config/theme.json'
import { SITE_TITLE, SITE_DESCRIPTION, SITE_LANG } from '../lib/site'

interface Props {
  title?: string
  description?: string
  current?: string
}

const { title, description, current } = Astro.props
const pageTitle = title ? \`\${title} · \${SITE_TITLE}\` : SITE_TITLE
const pageDesc = description ?? SITE_DESCRIPTION
const composition = themeFile.layoutComposition ?? 'lpShelf'
const paletteId =
  themeFile.paletteId === 'emprint' || themeFile.paletteId === 'paperInk'
    ? themeFile.paletteId
    : (() => {
        const accent = themeFile.tokens?.color?.accent ?? ''
        if (accent === '#0a0a0a' || accent === '#fafafa') return 'paperInk'
        return 'emprint'
      })()
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
    <LandingIntro />
    <Header />
    <main data-current={current}>
      <slot />
    </main>
    <Footer />
  </body>
</html>
`
}

function lpShelfAstro(EP: typeof EpFragmentsClasses, lang: 'ko' | 'en'): string {
  const empty =
    lang === 'ko' ? '아직 작품이 없습니다. Emprint에서 이미지를 추가해 보세요.' : 'No artworks yet. Add images in Emprint.'
  const prevLabel = lang === 'ko' ? '이전 작품' : 'Previous artwork'
  const nextLabel = lang === 'ko' ? '다음 작품' : 'Next artwork'
  const previewLabel = lang === 'ko' ? '크게 보기' : 'View larger'
  const closeLabel = lang === 'ko' ? '닫기' : 'Close'
  return `---
interface Item {
  id: string
  path: string
  title: string
  caption?: string
  sort: number
}

interface Props {
  items: Item[]
}

const { items } = Astro.props
const base = import.meta.env.BASE_URL

function publicSrc(workspacePath: string): string {
  const name = workspacePath.replace(/^artwork\\//, '')
  return \`\${base}artwork/\${name}\`
}
---
{items.length === 0 ? (
  <p class="${EP.Empty}">${empty}</p>
) : (
  <div class="${EP.ShelfCarousel}" data-lp-carousel>
    <div class="${EP.ShelfLayout}">
      <button type="button" class="${EP.ShelfNavBtn}" data-carousel-prev aria-label="${prevLabel}">‹</button>
      <div class="${EP.ShelfStage}">
        <div class="${EP.ShelfHub}" aria-hidden="true"></div>
        <div class="${EP.ShelfDisc}" data-carousel-disc>
          {items.map((item, index) => (
            <button
              type="button"
              class:list={['${EP.Record}', { '${EP.RecordActive}': index === 0 }]}
              data-carousel-record
              data-index={index}
              data-src={publicSrc(item.path)}
              data-title={item.title}
              data-caption={item.caption ?? ''}
              aria-label={item.title}
            >
              <img class="${EP.RecordCover}" src={publicSrc(item.path)} alt="" loading="lazy" decoding="async" />
            </button>
          ))}
        </div>
      </div>
      <button type="button" class="${EP.ShelfNavBtn}" data-carousel-next aria-label="${nextLabel}">›</button>
      <aside class="${EP.ShelfPreview}">
        <button type="button" class="${EP.ShelfPreviewBtn}" data-preview-open aria-label="${previewLabel}">
          <img class="${EP.RecordCover}" data-preview-img alt="" />
          <div class="${EP.ShelfPreviewMeta}">
            <strong data-preview-title></strong>
            <span data-preview-caption></span>
          </div>
        </button>
      </aside>
    </div>
  </div>
)}

<div class="${EP.Lightbox}" data-lightbox hidden>
  <div class="${EP.LightboxBackdrop}" data-lightbox-close></div>
  <div class="${EP.LightboxPanel}">
    <button type="button" class="${EP.LightboxClose}" data-lightbox-close aria-label="${closeLabel}">${closeLabel}</button>
    <img class="${EP.LightboxImage}" data-lightbox-img alt="" />
    <p class="${EP.LightboxCaption}" data-lightbox-caption></p>
  </div>
</div>

<script>
  const carousel = document.querySelector('[data-lp-carousel]')
  const box = document.querySelector('[data-lightbox]')
  if (!carousel || !box) throw new Error('LpShelf mount failed')

  const disc = carousel.querySelector('[data-carousel-disc]')
  const records = disc ? [...disc.querySelectorAll('[data-carousel-record]')] : []
  const prevBtn = carousel.querySelector('[data-carousel-prev]')
  const nextBtn = carousel.querySelector('[data-carousel-next]')
  const previewBtn = carousel.querySelector('[data-preview-open]')
  const previewImg = carousel.querySelector('[data-preview-img]')
  const previewTitle = carousel.querySelector('[data-preview-title]')
  const previewCaption = carousel.querySelector('[data-preview-caption]')
  const lightboxImg = box.querySelector('[data-lightbox-img]')
  const lightboxCap = box.querySelector('[data-lightbox-caption]')

  const count = records.length
  let index = 0
  const FRONT_DEG = 90
  const RADIUS = 42

  function layoutRecords() {
    if (!disc || count === 0) return
    const step = 360 / count
    const spin = -index * step
    disc.style.transform = 'rotate(' + spin + 'deg)'
    records.forEach((el, i) => {
      const angle = FRONT_DEG + i * step
      el.style.transform =
        'rotate(' + angle + 'deg) translateY(-' + RADIUS + '%) rotate(-' + angle + 'deg)'
      el.classList.toggle('${EP.RecordActive}', i === index)
    })
  }

  function itemAt(i) {
    return records[((i % count) + count) % count]
  }

  function updatePreview() {
    const el = itemAt(index)
    if (!el) return
    const src = el.getAttribute('data-src') || ''
    const title = el.getAttribute('data-title') || ''
    const caption = el.getAttribute('data-caption') || ''
    if (previewImg instanceof HTMLImageElement) {
      previewImg.src = src
      previewImg.alt = title
    }
    if (previewTitle) previewTitle.textContent = title
    if (previewCaption) {
      previewCaption.textContent = caption
      previewCaption.hidden = !caption
    }
    if (prevBtn instanceof HTMLButtonElement) prevBtn.disabled = count <= 1
    if (nextBtn instanceof HTMLButtonElement) nextBtn.disabled = count <= 1
  }

  function setIndex(next) {
    if (count === 0) return
    index = ((next % count) + count) % count
    layoutRecords()
    updatePreview()
  }

  function openLightbox() {
    const el = itemAt(index)
    if (!el || !(lightboxImg instanceof HTMLImageElement)) return
    const src = el.getAttribute('data-src') || ''
    const title = el.getAttribute('data-title') || ''
    const caption = el.getAttribute('data-caption') || ''
    lightboxImg.src = src
    lightboxImg.alt = title
    if (lightboxCap) {
      lightboxCap.textContent = caption || title
      lightboxCap.hidden = !(caption || title)
    }
    box.removeAttribute('hidden')
    box.setAttribute('data-open', 'true')
    document.body.style.overflow = 'hidden'
  }

  function closeLightbox() {
    box.setAttribute('hidden', '')
    box.removeAttribute('data-open')
    document.body.style.overflow = ''
  }

  prevBtn?.addEventListener('click', () => setIndex(index - 1))
  nextBtn?.addEventListener('click', () => setIndex(index + 1))
  previewBtn?.addEventListener('click', openLightbox)

  records.forEach((el) => {
    el.addEventListener('click', () => {
      const i = Number(el.getAttribute('data-index'))
      if (!Number.isNaN(i)) setIndex(i)
    })
  })

  box.querySelectorAll('[data-lightbox-close]').forEach((el) => {
    el.addEventListener('click', closeLightbox)
  })

  window.addEventListener('keydown', (e) => {
    const open = box.hasAttribute('data-open')
    if (open) {
      if (e.key === 'Escape') closeLightbox()
      if (e.key === 'ArrowRight') {
        setIndex(index + 1)
        openLightbox()
      }
      if (e.key === 'ArrowLeft') {
        setIndex(index - 1)
        openLightbox()
      }
      return
    }
    if (e.key === 'ArrowRight') setIndex(index + 1)
    if (e.key === 'ArrowLeft') setIndex(index - 1)
    if (e.key === 'Enter' && document.activeElement === previewBtn) openLightbox()
  })

  layoutRecords()
  updatePreview()
</script>
`
}

function galleryMasonryAstro(EP: typeof EpFragmentsClasses, lang: 'ko' | 'en'): string {
  const empty =
    lang === 'ko' ? '아직 작품이 없습니다. Emprint에서 이미지를 추가해 보세요.' : 'No artworks yet. Add images in Emprint.'
  const loading = lang === 'ko' ? '불러오는 중…' : 'Loading more…'
  const done = lang === 'ko' ? '모든 작품을 불러왔습니다.' : 'All artworks loaded.'
  const closeLabel = lang === 'ko' ? '닫기' : 'Close'
  return `---
interface Item {
  id: string
  path: string
  title: string
  caption?: string
  sort: number
}

interface Props {
  items: Item[]
}

const { items } = Astro.props
const base = import.meta.env.BASE_URL.endsWith('/')
  ? import.meta.env.BASE_URL
  : import.meta.env.BASE_URL + '/'

function publicSrc(workspacePath: string): string {
  const name = workspacePath.replace(/^artwork\\//, '')
  return base + 'artwork/' + name
}

const sorted = [...items].sort((a, b) => a.sort - b.sort)
---
{sorted.length === 0 ? (
  <p class="${EP.Empty}">${empty}</p>
) : (
  <>
    <div class="${EP.Masonry}" data-gallery-masonry>
      <div class="${EP.MasonryScroller}" data-masonry-scroller>
        <div class="${EP.MasonryWall}" data-masonry-wall>
          {sorted.map((item, index) => (
            <article
              class:list={['${EP.MasonryItem}', { 'is-pending': index >= 12 }]}
              data-masonry-item
              data-index={index}
              data-src={publicSrc(item.path)}
              data-title={item.title}
              data-caption={item.caption ?? ''}
              hidden={index >= 12}
            >
              <button type="button" class="${EP.MasonryItemBtn}" aria-label={item.title}>
                <img
                  class="${EP.RecordCover}"
                  src={publicSrc(item.path)}
                  alt={item.title}
                  loading={index < 16 ? 'eager' : 'lazy'}
                  decoding="async"
                  width="400"
                  height="400"
                />
                <span class="${EP.MasonryItemCaption}">{item.title}</span>
              </button>
            </article>
          ))}
        </div>
        <div class="${EP.MasonrySentinel}" data-masonry-sentinel aria-hidden="true"></div>
        <p class="${EP.MasonryStatus}" data-masonry-status hidden>${loading}</p>
      </div>
    </div>

    <div class="${EP.Lightbox}" data-lightbox hidden>
      <div class="${EP.LightboxBackdrop}" data-lightbox-close></div>
      <div class="${EP.LightboxPanel}">
        <button type="button" class="${EP.LightboxClose}" data-lightbox-close aria-label="${closeLabel}">
          ${closeLabel}
        </button>
        <img class="${EP.LightboxImage}" data-lightbox-img alt="" />
        <p class="${EP.LightboxCaption}" data-lightbox-caption></p>
      </div>
    </div>
  </>
)}

<script>
  function initGalleryMasonry() {
    const root = document.querySelector('[data-gallery-masonry]')
    const wall = root?.querySelector('[data-masonry-wall]')
    const sentinel = root?.querySelector('[data-masonry-sentinel]')
    const statusEl = root?.querySelector('[data-masonry-status]')
    const box = document.querySelector('[data-lightbox]')
    if (!root || !wall || !sentinel || !box) return

    const tiles = [...wall.querySelectorAll('[data-masonry-item]')]
    if (!tiles.length) return

    const BATCH = 12
    let revealed = Math.min(BATCH, tiles.length)
    let lightboxIndex = -1
    const lightboxImg = box.querySelector('[data-lightbox-img]')
    const lightboxCap = box.querySelector('[data-lightbox-caption]')

    function columnCount(width) {
      if (width < 520) return 2
      if (width < 900) return 3
      if (width < 1200) return 4
      return 5
    }

    function measure(tile) {
      const img = tile.querySelector('img')
      if (!(img instanceof HTMLImageElement)) return { w: 1, h: 1 }
      const w = img.naturalWidth || 1
      const h = img.naturalHeight || 1
      return { w, h }
    }

    function relayout() {
      const width = wall.clientWidth
      if (width <= 0) return false
      const cols = columnCount(width)
      const gap = 10
      const colWidth = (width - gap * (cols - 1)) / cols
      const heights = Array(cols).fill(0)
      let maxH = 0

      tiles.forEach((tile, index) => {
        if (index >= revealed || tile.hasAttribute('hidden')) return
        const { w, h } = measure(tile)
        const ratio = h / w
        const itemH = colWidth * ratio
        let col = 0
        for (let c = 1; c < cols; c++) {
          if (heights[c] < heights[col]) col = c
        }
        const left = col * (colWidth + gap)
        const top = heights[col]
        tile.style.width = colWidth + 'px'
        tile.style.height = itemH + 'px'
        tile.style.transform = 'translate(' + left + 'px,' + top + 'px)'
        heights[col] += itemH + gap
        if (heights[col] > maxH) maxH = heights[col]
      })

      wall.style.height = maxH + 'px'
      return true
    }

    function openLightbox(index) {
      const tile = tiles[index]
      if (!tile || !(lightboxImg instanceof HTMLImageElement)) return
      lightboxIndex = index
      lightboxImg.src = tile.getAttribute('data-src') || ''
      lightboxImg.alt = tile.getAttribute('data-title') || ''
      if (lightboxCap) {
        const caption = tile.getAttribute('data-caption') || ''
        const title = tile.getAttribute('data-title') || ''
        lightboxCap.textContent = caption || title
        lightboxCap.hidden = !(caption || title)
      }
      box.removeAttribute('hidden')
      box.setAttribute('data-open', 'true')
      document.body.style.overflow = 'hidden'
    }

    function closeLightbox() {
      box.setAttribute('hidden', '')
      box.removeAttribute('data-open')
      document.body.style.overflow = ''
      lightboxIndex = -1
    }

    function revealNextBatch() {
      if (revealed >= tiles.length) return
      const next = Math.min(revealed + BATCH, tiles.length)
      for (let i = revealed; i < next; i++) {
        const tile = tiles[i]
        tile.removeAttribute('hidden')
        tile.classList.remove('is-pending')
      }
      revealed = next
      relayout()
      if (statusEl) {
        if (revealed >= tiles.length) {
          statusEl.textContent = ${JSON.stringify(done)}
          statusEl.hidden = false
        } else {
          statusEl.hidden = true
        }
      }
      if (revealed >= tiles.length && observer) observer.disconnect()
    }

    tiles.forEach((tile) => {
      const btn = tile.querySelector('button')
      btn?.addEventListener('click', () => {
        const index = Number(tile.getAttribute('data-index'))
        if (!Number.isNaN(index)) openLightbox(index)
      })
      const img = tile.querySelector('img')
      img?.addEventListener('load', () => relayout())
    })

    let observer
    if ('IntersectionObserver' in window && revealed < tiles.length) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && revealed < tiles.length) {
              if (statusEl) {
                statusEl.textContent = ${JSON.stringify(loading)}
                statusEl.hidden = false
              }
              requestAnimationFrame(revealNextBatch)
            }
          })
        },
        { root: null, rootMargin: '480px 0px', threshold: 0 }
      )
      observer.observe(sentinel)
    }

    function startLayout() {
      if (relayout()) return
      requestAnimationFrame(startLayout)
    }

    startLayout()
    const ro = new ResizeObserver(() => relayout())
    ro.observe(wall)

    box.querySelectorAll('[data-lightbox-close]').forEach((el) => {
      el.addEventListener('click', closeLightbox)
    })

    window.addEventListener('keydown', (e) => {
      if (box.hasAttribute('hidden')) return
      if (e.key === 'Escape') closeLightbox()
      if (e.key === 'ArrowRight' && lightboxIndex >= 0) {
        openLightbox((lightboxIndex + 1) % tiles.length)
      }
      if (e.key === 'ArrowLeft' && lightboxIndex >= 0) {
        openLightbox((lightboxIndex - 1 + tiles.length) % tiles.length)
      }
    })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGalleryMasonry)
  } else {
    initGalleryMasonry()
  }
  document.addEventListener('astro:page-load', initGalleryMasonry)
</script>
`
}
