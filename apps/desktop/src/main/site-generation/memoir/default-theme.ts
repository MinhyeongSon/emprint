import { MEMOIR_THEME_PRESETS, type MemoirThemeFile } from '@emprint/shared'
import type { SiteGenerationContext } from '../site-project-generator'
import { accentSoftRgba, resolveAccentHex } from '../column/theme-color'

export function createDefaultMemoirTheme(ctx: SiteGenerationContext): MemoirThemeFile {
  const accentLight = resolveAccentHex(ctx.themeColor, '#2d6a4f')
  const accentDark = resolveAccentHex(ctx.themeColor, '#52b788')
  const base = structuredClone(MEMOIR_THEME_PRESETS.emprint)

  base.tokens.color.accent = accentLight
  base.tokens.color.accentSoft = accentSoftRgba(accentLight, 0.12)
  if (base.modes?.dark?.color) {
    base.modes.dark.color.accent = accentDark
    base.modes.dark.color.accentSoft = accentSoftRgba(accentDark, 0.14)
  }

  base.colorMode = 'system'
  return base
}
