import type { SiteGenerationContext } from '../site-project-generator'
import { createDefaultDictionaryTheme } from './default-theme'
import { dictionaryThemeToTokensCss } from '@emprint/shared'
import type { DictionaryThemeFile } from '@emprint/shared'
import componentsCssSource from './components.css?raw'
import landingIntroCssTemplate from '../shared/landing-intro.css?raw'

function loadComponentsCss(): string {
  return componentsCssSource
}

export function createDictionaryThemeJson(ctx: SiteGenerationContext): string {
  return JSON.stringify(createDefaultDictionaryTheme(ctx), null, 2) + '\n'
}

export function createDictionaryTokensCss(theme: DictionaryThemeFile): string {
  return dictionaryThemeToTokensCss(theme)
}

export function createDictionaryGlobalCss(): string {
  return `@import './tokens.css';
@import './components.css';
@import './landing-intro.css';
`
}

export function loadLandingIntroCss(): string {
  return landingIntroCssTemplate.replaceAll('__PREFIX__', 'ep-dictionary')
}

export { createDefaultDictionaryTheme, loadComponentsCss }
export type { DictionaryThemeFile } from '@emprint/shared'
