import type { SiteGenerationContext } from '../site-project-generator'
import { createDefaultColumnTheme } from './default-theme'
import { themeToTokensCss } from './generate-tokens-css'
import type { ColumnThemeFile } from '@emprint/shared'
import componentsCssSource from './components.css?raw'
import landingIntroCssTemplate from '../shared/landing-intro.css?raw'

function loadComponentsCss(): string {
  return componentsCssSource
}

export function createColumnThemeJson(ctx: SiteGenerationContext): string {
  return JSON.stringify(createDefaultColumnTheme(ctx), null, 2) + '\n'
}

export function createColumnTokensCss(theme: ColumnThemeFile): string {
  return themeToTokensCss(theme)
}

export function createColumnGlobalCss(): string {
  return `@import './tokens.css';
@import './components.css';
@import './landing-intro.css';
`
}

export function loadLandingIntroCss(): string {
  return landingIntroCssTemplate.replaceAll('__PREFIX__', 'ep-column')
}

export { createDefaultColumnTheme, loadComponentsCss, themeToTokensCss }
export type { ColumnThemeFile } from '@emprint/shared'
