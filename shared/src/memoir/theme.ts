/** Memoir anthology theme contract — `config/theme.json` schema. */

import type { AnthologyColorMode, AnthologyThemeFile, AnthologyThemeTokens } from '../anthology/theme'
import { ANTHOLOGY_THEME_CONTRACT_VERSION } from '../anthology/types'
import { getCanonicalSiteColors } from '../cross/canonical-palettes'
import { DEFAULT_LANDING_INTRO, normalizeLandingIntroConfig } from '../cross/landing-intro'
import { normalizeColorPalette, type ColorPaletteId } from '../cross/color-palette'
import { normalizeLayoutComposition, type LayoutCompositionId } from '../cross/layout-composition'

export const MEMOIR_CLASS_PREFIX = 'ep-memoir' as const
export type MemoirClassPrefix = typeof MEMOIR_CLASS_PREFIX

export type MemoirLayoutComposition = LayoutCompositionId
export type MemoirColorPaletteId = ColorPaletteId

/** @deprecated Combined preset id — use layoutComposition + colorPalette. */
export type MemoirThemePresetId = MemoirColorPaletteId

export type MemoirThemeFile = AnthologyThemeFile & {
  anthology: 'memoir'
  classPrefix: MemoirClassPrefix
  layoutComposition: MemoirLayoutComposition
  colorPalette: MemoirColorPaletteId
}

const EMPRINT_FONT: AnthologyThemeTokens['font'] = {
  sans: "ui-sans-serif, system-ui, 'Inter', 'Pretendard', 'Apple SD Gothic Neo', sans-serif",
  serif: "'Iowan Old Style', 'Source Serif Pro', 'Noto Serif KR', Georgia, serif",
  mono: "ui-monospace, SFMono-Regular, Menlo, 'JetBrains Mono', monospace"
}

const PAPER_INK_FONT: AnthologyThemeTokens['font'] = {
  sans: "ui-sans-serif, system-ui, 'Helvetica Neue', 'Arial', 'Apple SD Gothic Neo', sans-serif",
  serif: "'Libre Baskerville', 'Noto Serif KR', 'Times New Roman', Times, serif",
  mono: "ui-monospace, 'Courier New', Courier, monospace"
}

const TIMELINE_LAYOUT: AnthologyThemeTokens['layout'] = { measure: '40rem', wide: '56rem' }
const GRID_LAYOUT: AnthologyThemeTokens['layout'] = { measure: '44rem', wide: '68rem' }
const EDITORIAL_LAYOUT: AnthologyThemeTokens['layout'] = { measure: '46rem', wide: '72rem' }

const EMPRINT_RADIUS: AnthologyThemeTokens['radius'] = { sm: '4px', md: '10px', pill: '999px' }
const PAPER_INK_RADIUS: AnthologyThemeTokens['radius'] = { sm: '0px', md: '2px', pill: '2px' }

interface PaletteStyle {
  font: AnthologyThemeTokens['font']
  radius: AnthologyThemeTokens['radius']
}

const PALETTE_STYLE: Record<MemoirColorPaletteId, PaletteStyle> = {
  emprint: { font: EMPRINT_FONT, radius: EMPRINT_RADIUS },
  paperInk: { font: PAPER_INK_FONT, radius: PAPER_INK_RADIUS }
}

const COMPOSITION_LAYOUT: Record<MemoirLayoutComposition, AnthologyThemeTokens['layout']> = {
  timeline: TIMELINE_LAYOUT,
  grid: GRID_LAYOUT,
  editorial: EDITORIAL_LAYOUT
}

export const DEFAULT_MEMOIR_LAYOUT_COMPOSITION: MemoirLayoutComposition = 'timeline'
export const DEFAULT_MEMOIR_COLOR_PALETTE: MemoirColorPaletteId = 'emprint'
export const DEFAULT_MEMOIR_THEME_PRESET_ID: MemoirThemePresetId = DEFAULT_MEMOIR_COLOR_PALETTE

export function buildMemoirTheme(
  layoutComposition: MemoirLayoutComposition,
  colorPalette: MemoirColorPaletteId,
  colorMode: MemoirThemeFile['colorMode'] = 'system'
): MemoirThemeFile {
  const { light, dark } = getCanonicalSiteColors(colorPalette)
  const style = PALETTE_STYLE[colorPalette]
  return {
    contractVersion: ANTHOLOGY_THEME_CONTRACT_VERSION,
    anthology: 'memoir',
    classPrefix: MEMOIR_CLASS_PREFIX,
    layoutComposition,
    colorPalette,
    colorMode,
    tokens: {
      color: { ...light },
      font: style.font,
      layout: COMPOSITION_LAYOUT[layoutComposition],
      radius: style.radius
    },
    modes: { dark: { color: { ...dark } } },
    landingIntro: { ...DEFAULT_LANDING_INTRO }
  }
}

/** @deprecated Use buildMemoirTheme — emprint→timeline+emprint, paperInk→editorial+paperInk. */
export function buildMemoirThemeFromPreset(
  presetId: MemoirThemePresetId,
  colorMode: MemoirThemeFile['colorMode'] = 'system'
): MemoirThemeFile {
  const composition: MemoirLayoutComposition = presetId === 'paperInk' ? 'editorial' : 'timeline'
  return buildMemoirTheme(composition, presetId, colorMode)
}

/** @deprecated */
export const MEMOIR_THEME_PRESETS: Record<MemoirThemePresetId, MemoirThemeFile> = {
  emprint: buildMemoirTheme('timeline', 'emprint'),
  paperInk: buildMemoirTheme('editorial', 'paperInk')
}

export function inferMemoirLayoutComposition(theme: MemoirThemeFile): MemoirLayoutComposition {
  return normalizeLayoutComposition(theme.layoutComposition)
}

export function inferMemoirColorPalette(theme: MemoirThemeFile): MemoirColorPaletteId {
  return normalizeColorPalette(theme.colorPalette ?? DEFAULT_MEMOIR_COLOR_PALETTE)
}

/** @deprecated */
export function inferMemoirThemePresetId(theme: MemoirThemeFile): MemoirThemePresetId {
  return inferMemoirColorPalette(theme)
}

export function serializeMemoirThemeFile(theme: MemoirThemeFile): string {
  return `${JSON.stringify(theme, null, 2)}\n`
}

export function parseMemoirThemeFile(raw: string): MemoirThemeFile {
  const parsed = JSON.parse(raw) as Record<string, unknown>
  if (parsed.anthology !== 'memoir') {
    throw new Error('theme.json anthology must be "memoir".')
  }
  if (parsed.classPrefix !== MEMOIR_CLASS_PREFIX) {
    throw new Error(`Memoir theme classPrefix must be "${MEMOIR_CLASS_PREFIX}".`)
  }

  const layoutComposition = normalizeLayoutComposition(parsed.layoutComposition)
  const colorPalette = normalizeColorPalette(parsed.colorPalette ?? DEFAULT_MEMOIR_COLOR_PALETTE)

  const colorMode = normalizeColorMode(parsed.colorMode)
  const defaults = buildMemoirTheme(layoutComposition, colorPalette, colorMode)
  const merged = { ...defaults, ...(parsed as unknown as Partial<MemoirThemeFile>) }
  return {
    ...merged,
    anthology: 'memoir',
    classPrefix: MEMOIR_CLASS_PREFIX,
    layoutComposition,
    colorPalette,
    colorMode: normalizeColorMode(merged.colorMode),
    landingIntro: normalizeLandingIntroConfig(merged.landingIntro)
  }
}

function normalizeColorMode(value: unknown): AnthologyColorMode {
  if (value === 'light' || value === 'dark' || value === 'system') return value
  return 'system'
}
