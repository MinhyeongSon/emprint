import type { SiteGenerationContext } from '../site-project-generator'
import { buildBookTheme, type BookThemeFile } from '@emprint/shared'

export function createDefaultBookTheme(ctx: SiteGenerationContext): BookThemeFile {
  return buildBookTheme({
    presetId: 'emprint',
    layoutComposition: 'pages',
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
