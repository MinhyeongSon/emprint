import siteShared from './site-global-shared.css?raw'

export type SiteTemplateId = 'warm' | 'dark' | 'light'

const FONT_STACK = `  --font-sans: ui-sans-serif, system-ui, 'Inter', 'Pretendard', 'Apple SD Gothic Neo', sans-serif;
  --font-serif: 'Iowan Old Style', 'Source Serif Pro', 'Noto Serif KR', Georgia, serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, 'JetBrains Mono', monospace;
  --measure: 38rem;`

const ROOT_WARM = `:root {
  --bg: #faf8f4;
  --surface: #ffffff;
  --ink: #181715;
  --muted: #6c6962;
  --rule: #e8e4dc;
  --accent: #c4713f;
  --accent-soft: rgba(196, 113, 63, 0.12);
${FONT_STACK}
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #14130f;
    --surface: #1a1814;
    --ink: #f1ece2;
    --muted: #948d80;
    --rule: #2a261f;
    --accent: #e08a4a;
    --accent-soft: rgba(224, 138, 74, 0.14);
  }
}`

const ROOT_DARK = `:root {
  --bg: #0c0d10;
  --surface: #14151a;
  --ink: #eceef4;
  --muted: #9aa3b2;
  --rule: #252a34;
  --accent: #7dd3fc;
  --accent-soft: rgba(125, 211, 252, 0.12);
${FONT_STACK}
}`

const ROOT_LIGHT = `:root {
  --bg: #ffffff;
  --surface: #f4f6fb;
  --ink: #111827;
  --muted: #6b7280;
  --rule: #e5e7eb;
  --accent: #2563eb;
  --accent-soft: rgba(37, 99, 235, 0.12);
${FONT_STACK}
}`

const ROOTS: Record<SiteTemplateId, string> = {
  warm: ROOT_WARM,
  dark: ROOT_DARK,
  light: ROOT_LIGHT
}

/** Full `src/styles/global.css` body for a visual template preset. */
export function buildSiteGlobalStylesheet(variant: SiteTemplateId): string {
  return `${ROOTS[variant]}\n\n${siteShared.trim()}\n`
}

/** Best-effort match when reading `src/styles/global.css` from disk. */
export function inferSiteTemplateFromGlobalCss(css: string): SiteTemplateId {
  if (css.includes('--bg: #0c0d10') || css.includes('--bg:#0c0d10')) return 'dark'
  if (css.includes('--accent: #2563eb') || css.includes('--accent:#2563eb')) return 'light'
  return 'warm'
}
