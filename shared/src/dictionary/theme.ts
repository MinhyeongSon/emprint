/** Dictionary anthology theme contract — `config/theme.json` schema and presets. */

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
const ALPHABET_LAYOUT: DictionaryThemeLayoutTokens = {
  measure: '44rem',
  wide: 'min(84rem, 96vw)'
}
const COMPACT_LAYOUT: DictionaryThemeLayoutTokens = {
  measure: '40rem',
  wide: 'min(72rem, 94vw)'
}
const RADIUS: DictionaryThemeRadiusTokens = { sm: '4px', md: '8px', pill: '999px' }

const COMPOSITION_LAYOUT: Record<DictionaryLayoutComposition, DictionaryThemeLayoutTokens> = {
  reference: REFERENCE_LAYOUT,
  alphabet: ALPHABET_LAYOUT,
  compact: COMPACT_LAYOUT
}

/** Emprint — warm paper & ink (same palette as Column). */
const EMPRINT_LIGHT: DictionaryThemeColorTokens = {
  bg: '#faf8f4',
  surface: '#ffffff',
  ink: '#181715',
  muted: '#6c6962',
  rule: '#e8e4dc',
  accent: '#c4713f',
  accentSoft: 'rgba(196, 113, 63, 0.12)'
}

const EMPRINT_DARK: Partial<DictionaryThemeColorTokens> = {
  bg: '#14130f',
  surface: '#1a1814',
  ink: '#f1ece2',
  muted: '#948d80',
  rule: '#2a261f',
  accent: '#e08a4a',
  accentSoft: 'rgba(224, 138, 74, 0.14)'
}

/** Paper & Ink — black & white mono editorial (high-contrast ink on paper). */
const PAPER_INK_LIGHT: DictionaryThemeColorTokens = {
  bg: '#ffffff',
  surface: '#f5f5f5',
  ink: '#111111',
  muted: '#5c5c5c',
  rule: '#1a1a1a',
  accent: '#111111',
  accentSoft: 'rgba(0, 0, 0, 0.06)'
}

const PAPER_INK_DARK: Partial<DictionaryThemeColorTokens> = {
  bg: '#0a0a0a',
  surface: '#141414',
  ink: '#f5f5f5',
  muted: '#a3a3a3',
  rule: '#d4d4d4',
  accent: '#fafafa',
  accentSoft: 'rgba(255, 255, 255, 0.08)'
}

const PAPER_INK_RADIUS: DictionaryThemeRadiusTokens = { sm: '0px', md: '2px', pill: '2px' }

export const DEFAULT_DICTIONARY_THEME_PRESET_ID: DictionaryThemePresetId = 'emprint'

export const DICTIONARY_THEME_PRESETS: Record<DictionaryThemePresetId, DictionaryThemeFile> = {
  emprint: {
    contractVersion: 1,
    anthology: 'dictionary',
    classPrefix: DICTIONARY_CLASS_PREFIX,
    layoutComposition: DEFAULT_DICTIONARY_LAYOUT_COMPOSITION,
    colorMode: 'system',
    tokens: {
      color: EMPRINT_LIGHT,
      font: FONT,
      layout: COMPOSITION_LAYOUT.reference,
      radius: RADIUS
    },
    modes: { dark: { color: EMPRINT_DARK } },
    landingIntro: { ...DEFAULT_LANDING_INTRO }
  },
  paperInk: {
    contractVersion: 1,
    anthology: 'dictionary',
    classPrefix: DICTIONARY_CLASS_PREFIX,
    layoutComposition: DEFAULT_DICTIONARY_LAYOUT_COMPOSITION,
    colorMode: 'system',
    tokens: {
      color: PAPER_INK_LIGHT,
      font: FONT,
      layout: COMPOSITION_LAYOUT.reference,
      radius: PAPER_INK_RADIUS
    },
    modes: { dark: { color: PAPER_INK_DARK } },
    landingIntro: { ...DEFAULT_LANDING_INTRO }
  }
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

/** Restore Column-aligned palettes when an older Dictionary-only accent is detected. */
function migrateLegacyDictionaryPalette(theme: DictionaryThemeFile): void {
  const accent = theme.tokens.color.accent.toLowerCase()
  if (accent === '#3d6b9e' || accent === '#7eb8e8') {
    applyDictionaryPresetColors(theme, 'emprint')
    return
  }
  if (
    accent === '#0d9488' ||
    accent === '#5eead4' ||
    accent === '#2563eb' ||
    accent === '#7dd3fc'
  ) {
    applyDictionaryPresetColors(theme, 'paperInk')
  }
}

function applyDictionaryPresetColors(
  theme: DictionaryThemeFile,
  presetId: DictionaryThemePresetId
): void {
  const preset = DICTIONARY_THEME_PRESETS[presetId]
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
  if (parsed.layoutComposition) {
    parsed.tokens = {
      ...parsed.tokens,
      layout: COMPOSITION_LAYOUT[parsed.layoutComposition]
    }
  }
  return parsed
}

export function inferDictionaryThemePresetId(theme: DictionaryThemeFile): DictionaryThemePresetId {
  const lightAccent = theme.tokens.color.accent.toLowerCase()
  if (
    lightAccent === '#111111' ||
    lightAccent === '#2563eb' ||
    lightAccent === '#7dd3fc' ||
    lightAccent === '#0d9488' ||
    lightAccent === '#5eead4'
  ) {
    return 'paperInk'
  }
  return 'emprint'
}

export function serializeDictionaryThemeFile(theme: DictionaryThemeFile): string {
  return `${JSON.stringify(theme, null, 2)}\n`
}
