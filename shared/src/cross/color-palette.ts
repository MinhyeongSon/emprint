/**
 * Named color palettes — tokens only; layout composition is chosen separately.
 */

export const COLOR_PALETTE_IDS = ['emprint', 'paperInk'] as const
export type ColorPaletteId = (typeof COLOR_PALETTE_IDS)[number]

export interface ColorPaletteMeta {
  id: ColorPaletteId
  labelEn: string
  labelKo: string
  hintEn: string
  hintKo: string
}

export const COLOR_PALETTES: ColorPaletteMeta[] = [
  {
    id: 'emprint',
    labelEn: 'Emprint',
    labelKo: 'Emprint',
    hintEn: 'Warm paper, forest accent, soft radii.',
    hintKo: '따뜻한 종이 톤, 숲 녹색 포인트, 부드러운 모서리.'
  },
  {
    id: 'paperInk',
    labelEn: 'Paper & Ink',
    labelKo: 'Paper & Ink',
    hintEn: 'Black & white mono — crisp rules, ink-on-paper contrast.',
    hintKo: '흑백 모노톤 — 선명한 구분선, 종이 위 잉크 대비.'
  }
]

export function normalizeColorPalette(value: unknown): ColorPaletteId {
  if (value === 'paperInk' || value === 'emprint') return value
  return 'emprint'
}
