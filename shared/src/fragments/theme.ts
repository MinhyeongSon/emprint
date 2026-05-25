/** Fragments anthology theme contract — `config/theme.json` schema and presets. */

import {
  EMPRINT_BRAND_ACCENT,
  getCanonicalFragmentsSiteColors,
  inferColorPaletteFromSiteTokens,
  LEGACY_ACCENT
} from '../cross/canonical-palettes'
import { normalizeAnthologyColorMode } from '../anthology/theme-css'
import { DEFAULT_LANDING_INTRO, normalizeLandingIntroConfig, type LandingIntroConfig } from '../cross/landing-intro'
import {
  DEFAULT_FRAGMENTS_LAYOUT_COMPOSITION,
  normalizeFragmentsLayoutComposition,
  type FragmentsLayoutCompositionId
} from './layout-composition'

export const FRAGMENTS_CLASS_PREFIX = 'ep-fragments' as const
export type FragmentsClassPrefix = typeof FRAGMENTS_CLASS_PREFIX

export { EMPRINT_BRAND_ACCENT }

export interface FragmentsThemeColorTokens {
  bg: string
  surface: string
  ink: string
  muted: string
  rule: string
  accent: string
  accentSoft: string
  shelf: string
  shelfShadow: string
}

export interface FragmentsThemeFontTokens {
  sans: string
  serif: string
  mono: string
}

export interface FragmentsThemeLayoutTokens {
  measure: string
  wide: string
}

export interface FragmentsThemeRadiusTokens {
  sm: string
  md: string
  pill: string
}

export interface FragmentsThemeTokens {
  color: FragmentsThemeColorTokens
  font: FragmentsThemeFontTokens
  layout: FragmentsThemeLayoutTokens
  radius: FragmentsThemeRadiusTokens
}

export type FragmentsColorMode = 'system' | 'light' | 'dark'

export const DEFAULT_FRAGMENTS_COLOR_MODE: FragmentsColorMode = 'system'

export function normalizeFragmentsColorMode(value: unknown): FragmentsColorMode {
  return normalizeAnthologyColorMode(value)
}
export type FragmentsLayoutComposition = FragmentsLayoutCompositionId

export interface FragmentsThemeFile {
  contractVersion: 1
  anthology: 'fragments'
  classPrefix: FragmentsClassPrefix
  /** Persisted palette; older workspaces omit this and rely on {@link inferFragmentsThemePresetId}. */
  paletteId?: FragmentsThemePresetId
  layoutComposition?: FragmentsLayoutComposition
  colorMode?: FragmentsColorMode
  tokens: FragmentsThemeTokens
  modes?: {
    dark?: {
      color?: Partial<FragmentsThemeColorTokens>
    }
  }
  landingIntro?: LandingIntroConfig
}

/** Legacy preset ids: `midnight` → paperInk, `gallery` → emprint. */
export type FragmentsThemePresetId = 'emprint' | 'paperInk'

const FONT: FragmentsThemeFontTokens = {
  sans: "ui-sans-serif, system-ui, 'Inter', 'Pretendard', 'Apple SD Gothic Neo', sans-serif",
  serif: "'Iowan Old Style', 'Source Serif Pro', 'Noto Serif KR', Georgia, serif",
  mono: "ui-monospace, SFMono-Regular, Menlo, 'JetBrains Mono', monospace"
}

const LP_SHELF_LAYOUT: FragmentsThemeLayoutTokens = {
  measure: '48rem',
  wide: 'min(92rem, 96vw)'
}

export function normalizeFragmentsThemePresetId(
  presetId: FragmentsThemePresetId | 'midnight' | 'gallery'
): FragmentsThemePresetId {
  if (presetId === 'midnight') return 'paperInk'
  if (presetId === 'gallery') return 'emprint'
  return presetId
}

export function buildFragmentsTheme(input: {
  presetId: FragmentsThemePresetId | 'midnight' | 'gallery'
  layoutComposition?: FragmentsLayoutCompositionId
  colorMode?: FragmentsColorMode
  landingIntro?: LandingIntroConfig
}): FragmentsThemeFile {
  const presetId = normalizeFragmentsThemePresetId(input.presetId)
  const layoutComposition = normalizeFragmentsLayoutComposition(input.layoutComposition)
  const colors = getCanonicalFragmentsSiteColors(presetId)

  return {
    contractVersion: 1,
    anthology: 'fragments',
    classPrefix: FRAGMENTS_CLASS_PREFIX,
    paletteId: presetId,
    layoutComposition,
    colorMode: input.colorMode ?? 'system',
    tokens: {
      color: { ...colors.light },
      font: FONT,
      layout: LP_SHELF_LAYOUT,
      radius: { sm: '4px', md: '8px', pill: '999px' }
    },
    modes: { dark: { color: { ...colors.dark } } },
    landingIntro: normalizeLandingIntroConfig(input.landingIntro ?? DEFAULT_LANDING_INTRO)
  }
}

export function serializeFragmentsThemeFile(theme: FragmentsThemeFile): string {
  return `${JSON.stringify(theme, null, 2)}\n`
}

export function parseFragmentsThemeFile(raw: string): FragmentsThemeFile {
  const parsed = JSON.parse(raw) as FragmentsThemeFile
  if (parsed.contractVersion !== 1 || parsed.anthology !== 'fragments') {
    throw new Error('Invalid fragments theme.json')
  }
  return {
    ...parsed,
    layoutComposition: normalizeFragmentsLayoutComposition(parsed.layoutComposition),
    landingIntro: parsed.landingIntro
      ? normalizeLandingIntroConfig(parsed.landingIntro)
      : DEFAULT_LANDING_INTRO
  }
}

export function resolveFragmentsThemePaletteId(theme: FragmentsThemeFile): FragmentsThemePresetId {
  if (theme.paletteId === 'emprint' || theme.paletteId === 'paperInk') {
    return theme.paletteId
  }
  return inferFragmentsThemePresetId(theme)
}

export function inferFragmentsThemePresetId(theme: FragmentsThemeFile): FragmentsThemePresetId {
  const color = theme.tokens.color
  if (color.accent === LEGACY_ACCENT.midnight) {
    return 'paperInk'
  }
  return inferColorPaletteFromSiteTokens({ accent: color.accent, bg: color.bg })
}
