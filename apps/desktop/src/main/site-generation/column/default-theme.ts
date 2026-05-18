import {
  COLUMN_THEME_PRESETS,
  DEFAULT_COLUMN_LAYOUT_COMPOSITION,
  type ColumnThemeFile
} from '@emprint/shared'
import type { SiteGenerationContext } from '../site-project-generator'
import { accentSoftRgba, resolveAccentHex } from './theme-color'

export function createDefaultColumnTheme(ctx: SiteGenerationContext): ColumnThemeFile {
  const accentLight = resolveAccentHex(ctx.themeColor, '#c4713f')
  const accentDark = resolveAccentHex(ctx.themeColor, '#e08a4a')
  const base = structuredClone(COLUMN_THEME_PRESETS.emprint)

  base.tokens.color.accent = accentLight
  base.tokens.color.accentSoft = accentSoftRgba(accentLight, 0.12)
  if (base.modes?.dark?.color) {
    base.modes.dark.color.accent = accentDark
    base.modes.dark.color.accentSoft = accentSoftRgba(accentDark, 0.14)
  }

  base.layoutComposition = DEFAULT_COLUMN_LAYOUT_COMPOSITION
  base.colorMode = 'system'
  return base
}
