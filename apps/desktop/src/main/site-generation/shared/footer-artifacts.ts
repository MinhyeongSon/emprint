/** Shared Footer.astro body — reads `copyrightHolder` from config/site.json. */
export function footerAstroContent(opts: {
  footerClass: string
  footerInnerClass: string
  wideClass?: string
  mutedClass?: string
  lang: 'ko' | 'en'
  publishedWithEmprint?: boolean
}): string {
  const wide = opts.wideClass ? ` ${opts.wideClass}` : ''
  const muted = opts.mutedClass ? ` class="${opts.mutedClass}"` : ''
  const published = opts.publishedWithEmprint
    ? `\n    <span${muted}>${opts.lang === 'ko' ? 'Emprint로 발행됨' : 'Published with Emprint'}</span>`
    : ''
  return `---
import siteConfig from '../../config/site.json'
import { resolveSiteCopyrightHolder, type SitePublicConfig } from '../lib/site-public'

const config = siteConfig as SitePublicConfig
const year = new Date().getFullYear()
const copyrightName = resolveSiteCopyrightHolder(config, config.title || 'Site')
---

<footer class="${opts.footerClass}" data-pagefind-ignore>
  <div class="${opts.footerInnerClass}${wide}">
    <span>© {year} {copyrightName}</span>${published}
  </div>
</footer>
`
}

export function sitePublicLibArtifact(): { relativePath: string; content: string } {
  return {
    relativePath: 'src/lib/site-public.ts',
    content: `export interface SitePublicConfig {
  title: string
  description: string
  themeColor?: string
  layoutStyle?: string
  copyrightHolder?: string
}

export function resolveSiteCopyrightHolder(config: SitePublicConfig, fallbackTitle: string): string {
  const holder = config.copyrightHolder?.trim()
  if (holder) return holder
  const title = config.title?.trim()
  if (title) return title
  return fallbackTitle
}
`
  }
}
