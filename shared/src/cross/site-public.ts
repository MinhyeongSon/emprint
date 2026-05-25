/** Public site metadata in workspace `config/site.json` (Astro). */
export interface SitePublicConfig {
  title: string
  description: string
  themeColor?: string
  layoutStyle?: string
  /** Footer © line; synced from signed-in GitHub login when available. */
  copyrightHolder?: string
}

export function resolveSiteCopyrightHolder(config: SitePublicConfig, fallbackTitle: string): string {
  const holder = config.copyrightHolder?.trim()
  if (holder) return holder
  const title = config.title?.trim()
  if (title) return title
  return fallbackTitle
}
