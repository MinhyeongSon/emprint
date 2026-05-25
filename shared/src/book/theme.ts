/** Book anthology theme contract — `config/theme.json`. */

import {
  getCanonicalSiteColors,
  inferColorPaletteFromSiteTokens,
  LEGACY_ACCENT
} from '../cross/canonical-palettes'
import { normalizeAnthologyColorMode } from '../anthology/theme-css'
import { DEFAULT_LANDING_INTRO, normalizeLandingIntroConfig, type LandingIntroConfig } from '../cross/landing-intro'
import {
  DEFAULT_BOOK_LAYOUT_COMPOSITION,
  normalizeBookLayoutComposition,
  type BookLayoutCompositionId
} from './layout-composition'

export const BOOK_CLASS_PREFIX = 'ep-book' as const
export type BookClassPrefix = typeof BOOK_CLASS_PREFIX

export interface BookThemeColorTokens {
  bg: string
  surface: string
  ink: string
  muted: string
  rule: string
  accent: string
  accentSoft: string
}

export interface BookThemeFontTokens {
  sans: string
  serif: string
  mono: string
}

export interface BookThemeLayoutTokens {
  measure: string
  wide: string
}

export interface BookThemeRadiusTokens {
  sm: string
  md: string
  pill: string
}

export interface BookThemeTokens {
  color: BookThemeColorTokens
  font: BookThemeFontTokens
  layout: BookThemeLayoutTokens
  radius: BookThemeRadiusTokens
}

export type BookColorMode = 'system' | 'light' | 'dark'
export const DEFAULT_BOOK_COLOR_MODE: BookColorMode = 'system'

export function normalizeBookColorMode(value: unknown): BookColorMode {
  return normalizeAnthologyColorMode(value)
}

export type BookLayoutComposition = BookLayoutCompositionId
export type BookThemePresetId = 'emprint' | 'paperInk'

export interface BookThemeFile {
  contractVersion: 1
  anthology: 'book'
  classPrefix: BookClassPrefix
  paletteId?: BookThemePresetId
  layoutComposition?: BookLayoutComposition
  colorMode?: BookColorMode
  tokens: BookThemeTokens
  modes?: {
    dark?: {
      color?: Partial<BookThemeColorTokens>
    }
  }
  landingIntro?: LandingIntroConfig
}

const FONT: BookThemeFontTokens = {
  sans: "ui-sans-serif, system-ui, 'Inter', 'Pretendard', 'Apple SD Gothic Neo', sans-serif",
  serif: "'Iowan Old Style', 'Source Serif Pro', 'Noto Serif KR', Georgia, serif",
  mono: "ui-monospace, SFMono-Regular, Menlo, 'JetBrains Mono', monospace"
}

const BOOK_LAYOUT: BookThemeLayoutTokens = {
  measure: '42rem',
  wide: 'min(48rem, 92vw)'
}

export function normalizeBookThemePresetId(
  presetId: BookThemePresetId | 'midnight' | 'gallery'
): BookThemePresetId {
  if (presetId === 'midnight') return 'paperInk'
  if (presetId === 'gallery') return 'emprint'
  return presetId
}

export function buildBookTheme(input: {
  presetId: BookThemePresetId | 'midnight' | 'gallery'
  layoutComposition?: BookLayoutCompositionId
  colorMode?: BookColorMode
  landingIntro?: LandingIntroConfig
}): BookThemeFile {
  const presetId = normalizeBookThemePresetId(input.presetId)
  const layoutComposition = normalizeBookLayoutComposition(input.layoutComposition)
  const colors = getCanonicalSiteColors(presetId)

  return {
    contractVersion: 1,
    anthology: 'book',
    classPrefix: BOOK_CLASS_PREFIX,
    paletteId: presetId,
    layoutComposition,
    colorMode: input.colorMode ?? 'system',
    tokens: {
      color: { ...colors.light },
      font: FONT,
      layout: BOOK_LAYOUT,
      radius: { sm: '4px', md: '10px', pill: '999px' }
    },
    modes: { dark: { color: { ...colors.dark } } },
    landingIntro: normalizeLandingIntroConfig(input.landingIntro ?? DEFAULT_LANDING_INTRO)
  }
}

export function serializeBookThemeFile(theme: BookThemeFile): string {
  return `${JSON.stringify(theme, null, 2)}\n`
}

export function parseBookThemeFile(raw: string): BookThemeFile {
  const parsed = JSON.parse(raw) as BookThemeFile
  if (parsed.contractVersion !== 1 || parsed.anthology !== 'book') {
    throw new Error('Invalid book theme.json')
  }
  return {
    ...parsed,
    layoutComposition: normalizeBookLayoutComposition(parsed.layoutComposition),
    landingIntro: parsed.landingIntro
      ? normalizeLandingIntroConfig(parsed.landingIntro)
      : DEFAULT_LANDING_INTRO
  }
}

export function inferBookThemePresetId(theme: BookThemeFile): BookThemePresetId {
  if (theme.paletteId === 'emprint' || theme.paletteId === 'paperInk') {
    return theme.paletteId
  }
  const color = theme.tokens.color
  if (color.accent === LEGACY_ACCENT.midnight) {
    return 'paperInk'
  }
  return inferColorPaletteFromSiteTokens({ accent: color.accent, bg: color.bg })
}
