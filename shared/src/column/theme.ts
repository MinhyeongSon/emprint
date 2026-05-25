/** Column anthology theme contract — `config/theme.json` schema and presets. */

import { getCanonicalSiteColors, inferColorPaletteFromSiteTokens } from '../cross/canonical-palettes'
import {
  DEFAULT_COLUMN_LAYOUT_COMPOSITION,
  normalizeColumnLayoutComposition,
  type ColumnLayoutCompositionId
} from './layout-composition'
import { DEFAULT_LANDING_INTRO, normalizeLandingIntroConfig, type LandingIntroConfig } from '../cross/landing-intro'

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
  paletteId?: ColumnThemePresetId
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
const PAPER_INK_RADIUS: ColumnThemeRadiusTokens = { sm: '0px', md: '2px', pill: '2px' }

const COMPOSITION_LAYOUT: Record<ColumnLayoutComposition, ColumnThemeLayoutTokens> = {
  readingRoom: READING_ROOM_LAYOUT,
  magazine: MAGAZINE_LAYOUT,
  journal: JOURNAL_LAYOUT
}

function columnPresetBase(presetId: ColumnThemePresetId): Omit<ColumnThemeFile, 'layoutComposition'> {
  const { light, dark } = getCanonicalSiteColors(presetId)
  const radius = presetId === 'paperInk' ? PAPER_INK_RADIUS : RADIUS
  return {
    contractVersion: 1,
    anthology: 'column',
    classPrefix: COLUMN_CLASS_PREFIX,
    paletteId: presetId,
    colorMode: 'system',
    tokens: {
      color: { ...light },
      font: FONT,
      layout: COMPOSITION_LAYOUT.readingRoom,
      radius
    },
    modes: { dark: { color: { ...dark } } },
    landingIntro: { ...DEFAULT_LANDING_INTRO }
  }
}

export const DEFAULT_COLUMN_THEME_PRESET_ID: ColumnThemePresetId = 'emprint'
export { DEFAULT_COLUMN_LAYOUT_COMPOSITION }

export const COLUMN_THEME_PRESETS: Record<ColumnThemePresetId, ColumnThemeFile> = {
  emprint: { ...columnPresetBase('emprint'), layoutComposition: DEFAULT_COLUMN_LAYOUT_COMPOSITION },
  paperInk: { ...columnPresetBase('paperInk'), layoutComposition: DEFAULT_COLUMN_LAYOUT_COMPOSITION }
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
    paletteId: presetId,
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
  if (!parsed.paletteId) {
    parsed.paletteId = inferColumnThemePresetId(parsed)
  }
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
  if (theme.paletteId === 'emprint' || theme.paletteId === 'paperInk') {
    return theme.paletteId
  }
  return inferColorPaletteFromSiteTokens({
    accent: theme.tokens.color.accent,
    bg: theme.tokens.color.bg
  })
}

export function serializeColumnThemeFile(theme: ColumnThemeFile): string {
  return `${JSON.stringify(theme, null, 2)}\n`
}
