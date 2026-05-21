import { memoirThemeToTokensCss } from '@emprint/shared'
import type { SiteGenerationContext } from '../site-project-generator'
import { createDefaultMemoirTheme } from './default-theme'
import componentsCssSource from './components.css?raw'
import landingIntroCssTemplate from '../shared/landing-intro.css?raw'

export function loadMemoirComponentsCss(): string {
  return componentsCssSource
}

export function loadMemoirLandingIntroCss(): string {
  return landingIntroCssTemplate.replaceAll('__PREFIX__', 'ep-memoir')
}

export function createMemoirThemeJson(ctx: SiteGenerationContext): string {
  return JSON.stringify(createDefaultMemoirTheme(ctx), null, 2) + '\n'
}

export { memoirThemeToTokensCss }

export function createMemoirGlobalCss(): string {
  return `@import './tokens.css';
@import './components.css';
@import './landing-intro.css';
`
}

export { createDefaultMemoirTheme }
