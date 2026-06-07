/**
 * Opening landing intro — shared across all anthology site types.
 * Configured in `config/theme.json` → `landingIntro`.
 */

export const LANDING_INTRO_VARIANTS = ['terminal', 'script'] as const
export type LandingIntroVariant = (typeof LANDING_INTRO_VARIANTS)[number]

export interface LandingIntroConfig {
  /** Show the intro overlay on first paint (subject to showOnce). */
  enabled: boolean
  /** `terminal` — dark screen + typewriter. `script` — paper + handwriting reveal. */
  variant: LandingIntroVariant
  message: string
  /** Milliseconds between each character. */
  typingDelayMs: number
  /** Pause after the full message before fade-out. */
  pauseBeforeFadeMs: number
  /** Fade-out duration. */
  fadeDurationMs: number
  /** When true, skip intro after the visitor has seen it once (localStorage, all visits). */
  showOnce: boolean
}

export const DEFAULT_LANDING_INTRO_MESSAGE = 'Your content belongs to you.'

export const DEFAULT_LANDING_INTRO: LandingIntroConfig = {
  enabled: true,
  variant: 'terminal',
  message: DEFAULT_LANDING_INTRO_MESSAGE,
  typingDelayMs: 52,
  pauseBeforeFadeMs: 900,
  fadeDurationMs: 750,
  showOnce: true
}

export const LANDING_INTRO_VARIANT_META: {
  id: LandingIntroVariant
  labelEn: string
  labelKo: string
  hintEn: string
  hintKo: string
}[] = [
  {
    id: 'terminal',
    labelEn: 'Terminal',
    labelKo: '터미널',
    hintEn: 'Black screen; characters type in like a command line.',
    hintKo: '검은 화면에 터미널처럼 한 글자씩 입력됩니다.'
  },
  {
    id: 'script',
    labelEn: 'Script',
    labelKo: '필기',
    hintEn: 'Paper-white screen; message appears in a handwriting style.',
    hintKo: '종이처럼 하얀 화면에 필기체 느낌으로 글자가 써집니다.'
  }
]

export function normalizeLandingIntroVariant(value: unknown): LandingIntroVariant {
  if (value === 'script' || value === 'terminal') return value
  return 'terminal'
}

export function normalizeLandingIntroConfig(raw: unknown): LandingIntroConfig {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_LANDING_INTRO }
  }
  const o = raw as Record<string, unknown>
  const message = typeof o.message === 'string' && o.message.trim() ? o.message.trim() : DEFAULT_LANDING_INTRO_MESSAGE
  return {
    enabled: o.enabled !== false,
    variant: normalizeLandingIntroVariant(o.variant),
    message,
    typingDelayMs: typeof o.typingDelayMs === 'number' && o.typingDelayMs > 0 ? o.typingDelayMs : DEFAULT_LANDING_INTRO.typingDelayMs,
    pauseBeforeFadeMs:
      typeof o.pauseBeforeFadeMs === 'number' && o.pauseBeforeFadeMs >= 0
        ? o.pauseBeforeFadeMs
        : DEFAULT_LANDING_INTRO.pauseBeforeFadeMs,
    fadeDurationMs:
      typeof o.fadeDurationMs === 'number' && o.fadeDurationMs > 0
        ? o.fadeDurationMs
        : DEFAULT_LANDING_INTRO.fadeDurationMs,
    showOnce: o.showOnce !== false
  }
}

/** Read landing intro from a parsed theme.json object. */
export function resolveLandingIntroFromTheme(theme: Record<string, unknown>): LandingIntroConfig {
  return normalizeLandingIntroConfig(theme.landingIntro)
}

export function mergeLandingIntroIntoTheme<T extends Record<string, unknown>>(
  theme: T,
  landingIntro: LandingIntroConfig
): T & { landingIntro: LandingIntroConfig } {
  return { ...theme, landingIntro }
}
