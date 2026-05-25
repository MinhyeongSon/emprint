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
    hintEn: 'Warm paper and browns, brand orange accent (#cd7b00).',
    hintKo: '따뜻한 종이·브라운 톤, 브랜드 오렌지 포인트(#cd7b00).'
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

/** Published site default visitor theme (`theme.json` colorMode). */
export const SITE_COLOR_MODES = ['system', 'light', 'dark'] as const
export type SiteColorMode = (typeof SITE_COLOR_MODES)[number]

export const SITE_COLOR_MODE_META: {
  id: SiteColorMode
  labelEn: string
  labelKo: string
  hintEn: string
  hintKo: string
}[] = [
  {
    id: 'system',
    labelEn: 'System',
    labelKo: '시스템',
    hintEn: 'Follow the visitor OS light/dark preference.',
    hintKo: '방문자 OS 라이트/다크 설정을 따릅니다.'
  },
  {
    id: 'light',
    labelEn: 'Light',
    labelKo: '라이트',
    hintEn: 'Always use the palette light tokens.',
    hintKo: '팔레트 라이트 토큰을 항상 사용합니다.'
  },
  {
    id: 'dark',
    labelEn: 'Dark',
    labelKo: '다크',
    hintEn: 'Always use the palette dark tokens.',
    hintKo: '팔레트 다크 토큰을 항상 사용합니다.'
  }
]

export function normalizeSiteColorMode(value: unknown): SiteColorMode {
  if (value === 'light' || value === 'dark' || value === 'system') return value
  return 'system'
}
