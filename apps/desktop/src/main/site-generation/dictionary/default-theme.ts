import {
  DICTIONARY_THEME_PRESETS,
  DEFAULT_DICTIONARY_LAYOUT_COMPOSITION,
  EMPRINT_BRAND_ACCENT,
  type DictionaryThemeFile
} from '@emprint/shared'
import type { SiteGenerationContext } from '../site-project-generator'
import { accentSoftRgba, resolveAccentHex } from './theme-color'

export function createDefaultDictionaryTheme(ctx: SiteGenerationContext): DictionaryThemeFile {
  const accentLight = resolveAccentHex(ctx.themeColor, EMPRINT_BRAND_ACCENT)
  const accentDark = resolveAccentHex(ctx.themeColor, EMPRINT_BRAND_ACCENT)
  const base = structuredClone(DICTIONARY_THEME_PRESETS.emprint)

  base.tokens.color.accent = accentLight
  base.tokens.color.accentSoft = accentSoftRgba(accentLight, 0.12)
  if (base.modes?.dark?.color) {
    base.modes.dark.color.accent = accentDark
    base.modes.dark.color.accentSoft = accentSoftRgba(accentDark, 0.14)
  }

  base.layoutComposition = DEFAULT_DICTIONARY_LAYOUT_COMPOSITION
  base.colorMode = 'system'
  return base
}
