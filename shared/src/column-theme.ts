/** Column anthology theme contract — `config/theme.json` schema and presets. */

import {
  DEFAULT_COLUMN_LAYOUT_COMPOSITION,
  normalizeColumnLayoutComposition,
  type ColumnLayoutCompositionId
} from './column-layout-composition'
import { DEFAULT_LANDING_INTRO, normalizeLandingIntroConfig, type LandingIntroConfig } from './landing-intro'

/** CSS class + token prefix for Column (`ep-column-Header`, `--ep-column-color-bg`, …). */
export const COLUMN_CLASS_PREFIX = 'ep-column' as const
export type ColumnClassPrefix = typeof COLUMN_CLASS_PREFIX

export interface ColumnThemeColorTokens {
  bg: string
  surface: string
  ink: string
  muted: string
  rule: string
  accent: string
  accentSoft: string
}

export interface ColumnThemeFontTokens {
  sans: string
  serif: string
  mono: string
}

export interface ColumnThemeLayoutTokens {
  measure: string
  wide: string
}

export interface ColumnThemeRadiusTokens {
  sm: string
  md: string
  pill: string
}

export interface ColumnThemeTokens {
  color: ColumnThemeColorTokens
  font: ColumnThemeFontTokens
  layout: ColumnThemeLayoutTokens
  radius: ColumnThemeRadiusTokens
}

/** How the published site picks light vs dark colors. */
export type ColumnColorMode = 'system' | 'light' | 'dark'

export type ColumnLayoutComposition = ColumnLayoutCompositionId

export interface ColumnThemeFile {
  contractVersion: 1
  anthology: 'column'
  classPrefix: ColumnClassPrefix
  /** Structural layout for home / archive post listings. */
  layoutComposition?: ColumnLayoutComposition
  /** Default visitor theme when localStorage is empty (`system` = follow OS). */
  colorMode?: ColumnColorMode
  tokens: ColumnThemeTokens
  modes?: {
    dark?: {
      color?: Partial<ColumnThemeColorTokens>
    }
  }
  landingIntro?: LandingIntroConfig
}

/** Visual template presets (each includes light `:root` + dark `prefers-color-scheme`). */
export type ColumnThemePresetId = 'emprint' | 'paperInk'

const FONT: ColumnThemeFontTokens = {
  sans: "ui-sans-serif, system-ui, 'Inter', 'Pretendard', 'Apple SD Gothic Neo', sans-serif",
  serif: "'Iowan Old Style', 'Source Serif Pro', 'Noto Serif KR', Georgia, serif",
  mono: "ui-monospace, SFMono-Regular, Menlo, 'JetBrains Mono', monospace"
}

const READING_ROOM_LAYOUT: ColumnThemeLayoutTokens = { measure: '36rem', wide: '48rem' }
const MAGAZINE_LAYOUT: ColumnThemeLayoutTokens = { measure: '40rem', wide: '68rem' }
const JOURNAL_LAYOUT: ColumnThemeLayoutTokens = { measure: '38rem', wide: '52rem' }
const RADIUS: ColumnThemeRadiusTokens = { sm: '4px', md: '8px', pill: '999px' }

const COMPOSITION_LAYOUT: Record<ColumnLayoutComposition, ColumnThemeLayoutTokens> = {
  readingRoom: READING_ROOM_LAYOUT,
  magazine: MAGAZINE_LAYOUT,
  journal: JOURNAL_LAYOUT
}

/** Emprint — warm paper & ink (default column bootstrap). */
const EMPRINT_LIGHT: ColumnThemeColorTokens = {
  bg: '#faf8f4',
  surface: '#ffffff',
  ink: '#181715',
  muted: '#6c6962',
  rule: '#e8e4dc',
  accent: '#c4713f',
  accentSoft: 'rgba(196, 113, 63, 0.12)'
}

const EMPRINT_DARK: Partial<ColumnThemeColorTokens> = {
  bg: '#14130f',
  surface: '#1a1814',
  ink: '#f1ece2',
  muted: '#948d80',
  rule: '#2a261f',
  accent: '#e08a4a',
  accentSoft: 'rgba(224, 138, 74, 0.14)'
}

/** Paper & Ink — neutral editorial light + cool dark ink. */
const PAPER_INK_LIGHT: ColumnThemeColorTokens = {
  bg: '#ffffff',
  surface: '#f4f6fb',
  ink: '#111827',
  muted: '#6b7280',
  rule: '#e5e7eb',
  accent: '#2563eb',
  accentSoft: 'rgba(37, 99, 235, 0.12)'
}

const PAPER_INK_DARK: Partial<ColumnThemeColorTokens> = {
  bg: '#0c0d10',
  surface: '#14151a',
  ink: '#eceef4',
  muted: '#9aa3b2',
  rule: '#252a34',
  accent: '#7dd3fc',
  accentSoft: 'rgba(125, 211, 252, 0.12)'
}

export const DEFAULT_COLUMN_THEME_PRESET_ID: ColumnThemePresetId = 'emprint'
export { DEFAULT_COLUMN_LAYOUT_COMPOSITION }

export const COLUMN_THEME_PRESETS: Record<ColumnThemePresetId, ColumnThemeFile> = {
  emprint: {
    contractVersion: 1,
    anthology: 'column',
    classPrefix: COLUMN_CLASS_PREFIX,
    layoutComposition: DEFAULT_COLUMN_LAYOUT_COMPOSITION,
    colorMode: 'system',
    tokens: {
      color: EMPRINT_LIGHT,
      font: FONT,
      layout: COMPOSITION_LAYOUT.readingRoom,
      radius: RADIUS
    },
    modes: {
      dark: {
        color: EMPRINT_DARK
      }
    },
    landingIntro: { ...DEFAULT_LANDING_INTRO }
  },
  paperInk: {
    contractVersion: 1,
    anthology: 'column',
    classPrefix: COLUMN_CLASS_PREFIX,
    layoutComposition: DEFAULT_COLUMN_LAYOUT_COMPOSITION,
    colorMode: 'system',
    tokens: {
      color: PAPER_INK_LIGHT,
      font: FONT,
      layout: COMPOSITION_LAYOUT.readingRoom,
      radius: RADIUS
    },
    modes: {
      dark: {
        color: PAPER_INK_DARK
      }
    },
    landingIntro: { ...DEFAULT_LANDING_INTRO }
  }
}

export const DEFAULT_COLUMN_COLOR_MODE: ColumnColorMode = 'system'

export function normalizeColumnColorMode(value: unknown): ColumnColorMode {
  if (value === 'light' || value === 'dark' || value === 'system') return value
  return DEFAULT_COLUMN_COLOR_MODE
}

export function mergeColumnThemeColors(
  light: ColumnThemeColorTokens,
  darkPatch?: Partial<ColumnThemeColorTokens>
): ColumnThemeColorTokens {
  return { ...light, ...darkPatch }
}

export function resolveColumnThemePalette(theme: ColumnThemeFile): {
  light: ColumnThemeColorTokens
  dark: ColumnThemeColorTokens | null
} {
  const light = theme.tokens.color
  const darkPatch = theme.modes?.dark?.color
  return {
    light,
    dark: darkPatch ? mergeColumnThemeColors(light, darkPatch) : null
  }
}

export function buildColumnTheme(
  layoutComposition: ColumnLayoutComposition,
  presetId: ColumnThemePresetId,
  colorMode: ColumnColorMode = DEFAULT_COLUMN_COLOR_MODE
): ColumnThemeFile {
  const preset = structuredClone(COLUMN_THEME_PRESETS[presetId])
  return {
    ...preset,
    layoutComposition,
    colorMode,
    tokens: {
      ...preset.tokens,
      layout: COMPOSITION_LAYOUT[layoutComposition]
    }
  }
}

export function buildColumnThemeFromPreset(
  presetId: ColumnThemePresetId,
  colorMode: ColumnColorMode = DEFAULT_COLUMN_COLOR_MODE
): ColumnThemeFile {
  return buildColumnTheme(DEFAULT_COLUMN_LAYOUT_COMPOSITION, presetId, colorMode)
}

export function inferColumnLayoutComposition(theme: ColumnThemeFile): ColumnLayoutComposition {
  return normalizeColumnLayoutComposition(theme.layoutComposition)
}

export function parseColumnThemeFile(raw: string): ColumnThemeFile {
  const parsed = JSON.parse(raw) as ColumnThemeFile
  if (parsed.contractVersion !== 1 || parsed.anthology !== 'column') {
    throw new Error('Unsupported theme.json contract.')
  }
  if (parsed.classPrefix !== COLUMN_CLASS_PREFIX) {
    throw new Error('Unsupported theme.json contract.')
  }
  parsed.layoutComposition = inferColumnLayoutComposition(parsed)
  parsed.colorMode = normalizeColumnColorMode(parsed.colorMode)
  parsed.landingIntro = normalizeLandingIntroConfig(parsed.landingIntro)
  if (parsed.layoutComposition) {
    parsed.tokens = {
      ...parsed.tokens,
      layout: COMPOSITION_LAYOUT[parsed.layoutComposition]
    }
  }
  return parsed
}

/** Match Template mode selection from theme token accents. */
export function inferColumnThemePresetId(theme: ColumnThemeFile): ColumnThemePresetId {
  const lightAccent = theme.tokens.color.accent.toLowerCase()
  const darkAccent = theme.modes?.dark?.color?.accent?.toLowerCase()

  if (lightAccent === '#2563eb' || darkAccent === '#7dd3fc') {
    return 'paperInk'
  }
  if (lightAccent === '#7dd3fc' && !theme.modes?.dark?.color) {
    return 'paperInk'
  }

  return 'emprint'
}

export function serializeColumnThemeFile(theme: ColumnThemeFile): string {
  return `${JSON.stringify(theme, null, 2)}\n`
}
