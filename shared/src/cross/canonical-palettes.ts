/**
 * Single source of truth for Emprint / Paper & Ink colors (app UI + published sites).
 * See docs/COLOR_PALETTES.md — do not duplicate hex in anthology theme files.
 */

import type { ColorPaletteId } from './color-palette'

/** Brand orange — desktop `--accent` and site Emprint accent. */
export const EMPRINT_BRAND_ACCENT = '#cd7b00'

export interface CanonicalSiteColorTokens {
  bg: string
  surface: string
  ink: string
  muted: string
  rule: string
  accent: string
  accentSoft: string
}

export interface FragmentsPaletteExtras {
  shelf: string
  shelfShadow: string
}

export type AppColorScheme = 'light' | 'dark'

/** RGB triplets for `rgb(var(--base))` in desktop globals.css */
export interface AppUiRgbTokens {
  base: string
  panel: string
  panel2: string
  surface: string
  border: string
  accent: string
  ink: string
  muted: string
  danger: string
  dangerBg: string
  dangerInk: string
}

/** Published site — Emprint light (warm cream paper). */
export const CANONICAL_EMPRINT_SITE_LIGHT: CanonicalSiteColorTokens = {
  bg: '#f4f0e8',
  surface: '#ebe4d6',
  ink: '#1a1814',
  muted: '#5c564c',
  rule: '#c9bfb0',
  accent: EMPRINT_BRAND_ACCENT,
  accentSoft: 'rgba(205, 123, 0, 0.14)'
}

/** Published site — Emprint dark (desktop warm browns). */
export const CANONICAL_EMPRINT_SITE_DARK: CanonicalSiteColorTokens = {
  bg: '#1a1612',
  surface: '#231f1a',
  ink: '#f5ebe0',
  muted: '#b8a99a',
  rule: '#3d352c',
  accent: EMPRINT_BRAND_ACCENT,
  accentSoft: 'rgba(205, 123, 0, 0.18)'
}

/** Published site — Paper & Ink light. */
export const CANONICAL_PAPER_INK_SITE_LIGHT: CanonicalSiteColorTokens = {
  bg: '#ffffff',
  surface: '#f5f5f5',
  ink: '#111111',
  muted: '#5c5c5c',
  rule: '#d4d4d4',
  accent: '#111111',
  accentSoft: 'rgba(0, 0, 0, 0.06)'
}

/** Published site — Paper & Ink dark. */
export const CANONICAL_PAPER_INK_SITE_DARK: CanonicalSiteColorTokens = {
  bg: '#0a0a0a',
  surface: '#141414',
  ink: '#f5f5f5',
  muted: '#a3a3a3',
  rule: '#2e2e2e',
  accent: '#fafafa',
  accentSoft: 'rgba(255, 255, 255, 0.08)'
}

export const FRAGMENTS_EMPRINT_EXTRAS_LIGHT: FragmentsPaletteExtras = {
  shelf: '#3d3528',
  shelfShadow: 'rgba(26, 22, 16, 0.35)'
}

export const FRAGMENTS_EMPRINT_EXTRAS_DARK: FragmentsPaletteExtras = {
  shelf: '#0a0908',
  shelfShadow: 'rgba(0, 0, 0, 0.55)'
}

export const FRAGMENTS_PAPER_INK_EXTRAS_LIGHT: FragmentsPaletteExtras = {
  shelf: '#171717',
  shelfShadow: 'rgba(0, 0, 0, 0.28)'
}

export const FRAGMENTS_PAPER_INK_EXTRAS_DARK: FragmentsPaletteExtras = {
  shelf: '#000000',
  shelfShadow: 'rgba(0, 0, 0, 0.65)'
}

/** Desktop — Emprint + dark (former `warm`). */
export const CANONICAL_EMPRINT_UI_DARK: AppUiRgbTokens = {
  base: '26 22 18',
  panel: '35 31 26',
  panel2: '42 37 32',
  surface: '30 26 22',
  border: '61 53 44',
  accent: '205 123 0',
  ink: '245 235 224',
  muted: '184 169 154',
  danger: '239 68 68',
  dangerBg: '55 28 24',
  dangerInk: '253 186 186'
}

/** Desktop — Emprint + light (warm cream; mirrors site light). */
export const CANONICAL_EMPRINT_UI_LIGHT: AppUiRgbTokens = {
  base: '244 240 232',
  panel: '235 228 214',
  panel2: '238 232 220',
  surface: '255 255 255',
  border: '201 191 176',
  accent: '205 123 0',
  ink: '26 24 20',
  muted: '92 86 76',
  danger: '220 38 38',
  dangerBg: '254 242 242',
  dangerInk: '153 27 27'
}

/** Desktop — Paper & Ink + light (former global `light`). */
export const CANONICAL_PAPER_INK_UI_LIGHT: AppUiRgbTokens = {
  base: '243 244 246',
  panel: '255 255 255',
  panel2: '243 244 246',
  surface: '255 255 255',
  border: '209 213 219',
  accent: '205 123 0',
  ink: '15 17 21',
  muted: '55 65 81',
  danger: '220 38 38',
  dangerBg: '254 242 242',
  dangerInk: '153 27 27'
}

/** Desktop — Paper & Ink + dark (former `:root` default). */
export const CANONICAL_PAPER_INK_UI_DARK: AppUiRgbTokens = {
  base: '15 17 21',
  panel: '17 19 23',
  panel2: '24 27 33',
  surface: '20 23 28',
  border: '34 37 43',
  accent: '205 123 0',
  ink: '243 244 246',
  muted: '156 163 175',
  danger: '239 68 68',
  dangerBg: '45 15 15',
  dangerInk: '253 186 186'
}

/** @deprecated Legacy accents for inferring old workspaces only. */
export const LEGACY_ACCENT = {
  copper: '#c4713f',
  emprintOrange: '#c45c2a',
  memoirGreen: '#2d6a4f',
  memoirGreenDark: '#52b788',
  columnBlue: '#2563eb',
  columnBlueDark: '#7dd3fc',
  midnight: '#e07a3a',
  dictionaryTeal: '#0d9488'
} as const

const SITE_BY_PALETTE: Record<
  ColorPaletteId,
  { light: CanonicalSiteColorTokens; dark: CanonicalSiteColorTokens }
> = {
  emprint: { light: CANONICAL_EMPRINT_SITE_LIGHT, dark: CANONICAL_EMPRINT_SITE_DARK },
  paperInk: { light: CANONICAL_PAPER_INK_SITE_LIGHT, dark: CANONICAL_PAPER_INK_SITE_DARK }
}

const FRAGMENTS_EXTRAS_BY_PALETTE: Record<
  ColorPaletteId,
  { light: FragmentsPaletteExtras; dark: FragmentsPaletteExtras }
> = {
  emprint: { light: FRAGMENTS_EMPRINT_EXTRAS_LIGHT, dark: FRAGMENTS_EMPRINT_EXTRAS_DARK },
  paperInk: { light: FRAGMENTS_PAPER_INK_EXTRAS_LIGHT, dark: FRAGMENTS_PAPER_INK_EXTRAS_DARK }
}

const APP_UI_BY_PALETTE_SCHEME: Record<ColorPaletteId, Record<AppColorScheme, AppUiRgbTokens>> = {
  emprint: { light: CANONICAL_EMPRINT_UI_LIGHT, dark: CANONICAL_EMPRINT_UI_DARK },
  paperInk: { light: CANONICAL_PAPER_INK_UI_LIGHT, dark: CANONICAL_PAPER_INK_UI_DARK }
}

export function getCanonicalSiteColors(palette: ColorPaletteId): {
  light: CanonicalSiteColorTokens
  dark: CanonicalSiteColorTokens
} {
  return SITE_BY_PALETTE[palette]
}

export function getCanonicalFragmentsSiteColors(palette: ColorPaletteId): {
  light: CanonicalSiteColorTokens & FragmentsPaletteExtras
  dark: CanonicalSiteColorTokens & FragmentsPaletteExtras
} {
  const site = getCanonicalSiteColors(palette)
  const extras = FRAGMENTS_EXTRAS_BY_PALETTE[palette]
  return {
    light: { ...site.light, ...extras.light },
    dark: { ...site.dark, ...extras.dark }
  }
}

export function getCanonicalAppUiRgb(
  palette: ColorPaletteId,
  scheme: AppColorScheme
): AppUiRgbTokens {
  return APP_UI_BY_PALETTE_SCHEME[palette][scheme]
}

/** Infer palette from site token accent/bg (shared across anthologies). */
export function inferColorPaletteFromSiteTokens(input: {
  accent: string
  bg?: string
}): ColorPaletteId {
  const accent = input.accent.toLowerCase()
  const bg = input.bg?.toLowerCase()

  if (
    accent === CANONICAL_PAPER_INK_SITE_LIGHT.accent ||
    accent === CANONICAL_PAPER_INK_SITE_DARK.accent ||
    accent === LEGACY_ACCENT.columnBlue ||
    accent === LEGACY_ACCENT.columnBlueDark ||
    accent === LEGACY_ACCENT.dictionaryTeal ||
    accent === '#5eead4' ||
    bg === CANONICAL_PAPER_INK_SITE_LIGHT.bg ||
    bg === CANONICAL_PAPER_INK_SITE_DARK.bg
  ) {
    return 'paperInk'
  }

  return 'emprint'
}
