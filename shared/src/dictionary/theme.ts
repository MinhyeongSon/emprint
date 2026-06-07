/** Dictionary anthology theme contract — `config/theme.json` schema and presets. */

import {
  getCanonicalSiteColors,
  inferColorPaletteFromSiteTokens,
  LEGACY_ACCENT
} from '../cross/canonical-palettes'
import { DEFAULT_LANDING_INTRO, normalizeLandingIntroConfig, type LandingIntroConfig } from '../cross/landing-intro'
import {
  DEFAULT_DICTIONARY_LAYOUT_COMPOSITION,
  normalizeDictionaryLayoutComposition,
  type DictionaryLayoutCompositionId
} from './layout-composition'

export const DICTIONARY_CLASS_PREFIX = 'ep-dictionary' as const
export type DictionaryClassPrefix = typeof DICTIONARY_CLASS_PREFIX

export interface DictionaryThemeColorTokens {
  bg: string
  surface: string
  ink: string
  muted: string
  rule: string
  accent: string
  accentSoft: string
}

export interface DictionaryThemeFontTokens {
  sans: string
  serif: string
  mono: string
}

export interface DictionaryThemeLayoutTokens {
  measure: string
  wide: string
}

export interface DictionaryThemeRadiusTokens {
  sm: string
  md: string
  pill: string
}

export interface DictionaryThemeTokens {
  color: DictionaryThemeColorTokens
  font: DictionaryThemeFontTokens
  layout: DictionaryThemeLayoutTokens
  radius: DictionaryThemeRadiusTokens
}

export type DictionaryColorMode = 'system' | 'light' | 'dark'
export type DictionaryLayoutComposition = DictionaryLayoutCompositionId

export interface DictionaryThemeFile {
  contractVersion: 1
  anthology: 'dictionary'
  classPrefix: DictionaryClassPrefix
  paletteId?: DictionaryThemePresetId
  layoutComposition?: DictionaryLayoutComposition
  colorMode?: DictionaryColorMode
  tokens: DictionaryThemeTokens
  modes?: {
    dark?: {
      color?: Partial<DictionaryThemeColorTokens>
    }
  }
  landingIntro?: LandingIntroConfig
}

export type DictionaryThemePresetId = 'emprint' | 'paperInk'

const FONT: DictionaryThemeFontTokens = {
  sans: "ui-sans-serif, system-ui, 'Inter', 'Pretendard', 'Apple SD Gothic Neo', sans-serif",
  serif: "'Iowan Old Style', 'Source Serif Pro', 'Noto Serif KR', Georgia, serif",
  mono: "ui-monospace, SFMono-Regular, Menlo, 'JetBrains Mono', monospace"
}

const REFERENCE_LAYOUT: DictionaryThemeLayoutTokens = {
  measure: '42rem',
  wide: '76rem'
}
const GRAPH_LAYOUT: DictionaryThemeLayoutTokens = {
  measure: '48rem',
  wide: 'min(96rem, 98vw)'
}
const ATLAS_LAYOUT: DictionaryThemeLayoutTokens = {
  measure: '44rem',
  wide: 'min(88rem, 96vw)'
}
const RADIUS: DictionaryThemeRadiusTokens = { sm: '4px', md: '8px', pill: '999px' }
const PAPER_INK_RADIUS: DictionaryThemeRadiusTokens = { sm: '0px', md: '2px', pill: '2px' }

const COMPOSITION_LAYOUT: Record<DictionaryLayoutComposition, DictionaryThemeLayoutTokens> = {
  reference: REFERENCE_LAYOUT,
  graph: GRAPH_LAYOUT,
  atlas: ATLAS_LAYOUT
}

function dictionaryPresetBase(presetId: DictionaryThemePresetId): Omit<DictionaryThemeFile, 'layoutComposition'> {
  const { light, dark } = getCanonicalSiteColors(presetId)
  const radius = presetId === 'paperInk' ? PAPER_INK_RADIUS : RADIUS
  return {
    contractVersion: 1,
    anthology: 'dictionary',
    classPrefix: DICTIONARY_CLASS_PREFIX,
    paletteId: presetId,
    colorMode: 'system',
    tokens: {
      color: { ...light },
      font: FONT,
      layout: COMPOSITION_LAYOUT.reference,
      radius
    },
    modes: { dark: { color: { ...dark } } },
    landingIntro: { ...DEFAULT_LANDING_INTRO }
  }
}

export const DEFAULT_DICTIONARY_THEME_PRESET_ID: DictionaryThemePresetId = 'emprint'

export const DICTIONARY_THEME_PRESETS: Record<DictionaryThemePresetId, DictionaryThemeFile> = {
  emprint: { ...dictionaryPresetBase('emprint'), layoutComposition: DEFAULT_DICTIONARY_LAYOUT_COMPOSITION },
  paperInk: { ...dictionaryPresetBase('paperInk'), layoutComposition: DEFAULT_DICTIONARY_LAYOUT_COMPOSITION }
}

export const DEFAULT_DICTIONARY_COLOR_MODE: DictionaryColorMode = 'system'

export function normalizeDictionaryColorMode(value: unknown): DictionaryColorMode {
  if (value === 'light' || value === 'dark' || value === 'system') return value
  return DEFAULT_DICTIONARY_COLOR_MODE
}

export function inferDictionaryLayoutComposition(theme: DictionaryThemeFile): DictionaryLayoutComposition {
  return normalizeDictionaryLayoutComposition(theme.layoutComposition)
}

export function buildDictionaryTheme(
  layoutComposition: DictionaryLayoutComposition,
  presetId: DictionaryThemePresetId,
  colorMode: DictionaryColorMode = DEFAULT_DICTIONARY_COLOR_MODE
): DictionaryThemeFile {
  const preset = structuredClone(DICTIONARY_THEME_PRESETS[presetId])
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

export function buildDictionaryThemeFromPreset(
  presetId: DictionaryThemePresetId,
  colorMode: DictionaryColorMode = DEFAULT_DICTIONARY_COLOR_MODE
): DictionaryThemeFile {
  return buildDictionaryTheme(DEFAULT_DICTIONARY_LAYOUT_COMPOSITION, presetId, colorMode)
}

/** Restore canonical palettes when an older Dictionary-only accent is detected. */
function migrateLegacyDictionaryPalette(theme: DictionaryThemeFile): void {
  const accent = theme.tokens.color.accent.toLowerCase()
  if (accent === '#3d6b9e' || accent === '#7eb8e8') {
    applyDictionaryPresetColors(theme, 'emprint')
    return
  }
  if (
    accent === LEGACY_ACCENT.dictionaryTeal ||
    accent === '#5eead4' ||
    accent === LEGACY_ACCENT.columnBlue ||
    accent === LEGACY_ACCENT.columnBlueDark
  ) {
    applyDictionaryPresetColors(theme, 'paperInk')
  }
}

function applyDictionaryPresetColors(
  theme: DictionaryThemeFile,
  presetId: DictionaryThemePresetId
): void {
  const preset = DICTIONARY_THEME_PRESETS[presetId]
  theme.paletteId = presetId
  theme.tokens = {
    ...theme.tokens,
    color: { ...preset.tokens.color },
    radius: { ...preset.tokens.radius }
  }
  if (preset.modes) {
    theme.modes = structuredClone(preset.modes)
  } else {
    delete theme.modes
  }
}

export function parseDictionaryThemeFile(raw: string): DictionaryThemeFile {
  const parsed = JSON.parse(raw) as DictionaryThemeFile
  if (parsed.contractVersion !== 1 || parsed.anthology !== 'dictionary') {
    throw new Error('Unsupported theme.json contract.')
  }
  if (parsed.classPrefix !== DICTIONARY_CLASS_PREFIX) {
    throw new Error('Unsupported theme.json contract.')
  }
  parsed.layoutComposition = inferDictionaryLayoutComposition(parsed)
  parsed.colorMode = normalizeDictionaryColorMode(parsed.colorMode)
  parsed.landingIntro = normalizeLandingIntroConfig(parsed.landingIntro)
  migrateLegacyDictionaryPalette(parsed)
  if (!parsed.paletteId) {
    parsed.paletteId = inferDictionaryThemePresetId(parsed)
  }
  if (parsed.layoutComposition) {
    parsed.tokens = {
      ...parsed.tokens,
      layout: COMPOSITION_LAYOUT[parsed.layoutComposition]
    }
  }
  return parsed
}

export function inferDictionaryThemePresetId(theme: DictionaryThemeFile): DictionaryThemePresetId {
  if (theme.paletteId === 'emprint' || theme.paletteId === 'paperInk') {
    return theme.paletteId
  }
  return inferColorPaletteFromSiteTokens({
    accent: theme.tokens.color.accent,
    bg: theme.tokens.color.bg
  })
}

export function serializeDictionaryThemeFile(theme: DictionaryThemeFile): string {
  return `${JSON.stringify(theme, null, 2)}\n`
}
