import type { AnthologyKind } from './types'
import { ANTHOLOGY_THEME_CONTRACT_VERSION } from './types'
import type { LandingIntroConfig } from '../cross/landing-intro'

/** Shared color / typography tokens — themes interpret; structure stays semantic. */
export interface AnthologyThemeColorTokens {
  bg: string
  surface: string
  ink: string
  muted: string
  rule: string
  accent: string
  accentSoft: string
}

export interface AnthologyThemeFontTokens {
  sans: string
  serif: string
  mono: string
}

export interface AnthologyThemeLayoutTokens {
  measure: string
  wide: string
}

export interface AnthologyThemeRadiusTokens {
  sm: string
  md: string
  pill: string
}

export interface AnthologyThemeTokens {
  color: AnthologyThemeColorTokens
  font: AnthologyThemeFontTokens
  layout: AnthologyThemeLayoutTokens
  radius: AnthologyThemeRadiusTokens
}

export type AnthologyColorMode = 'system' | 'light' | 'dark'

/** Base shape for `config/theme.json` across anthology kinds. */
export interface AnthologyThemeFile {
  contractVersion: typeof ANTHOLOGY_THEME_CONTRACT_VERSION
  anthology: AnthologyKind
  classPrefix: `ep-${AnthologyKind}`
  colorMode?: AnthologyColorMode
  tokens: AnthologyThemeTokens
  modes?: {
    dark?: {
      color?: Partial<AnthologyThemeColorTokens>
    }
  }
  /** Optional opening overlay before site content (see `landing-intro.ts`). */
  landingIntro?: LandingIntroConfig
}
