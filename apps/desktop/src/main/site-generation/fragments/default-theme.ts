import type { SiteGenerationContext } from '../site-project-generator'
import { buildFragmentsTheme, type FragmentsThemeFile } from '@emprint/shared'

export function createDefaultFragmentsTheme(ctx: SiteGenerationContext): FragmentsThemeFile {
  return buildFragmentsTheme({
    presetId: 'emprint',
    layoutComposition: 'lpShelf',
    landingIntro: {
      enabled: false,
      variant: 'script',
      message: ctx.title,
      typingDelayMs: 42,
      pauseBeforeFadeMs: 900,
      fadeDurationMs: 600,
      showOnce: true
    }
  })
}
