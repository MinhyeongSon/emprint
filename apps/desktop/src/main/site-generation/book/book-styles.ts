import type { SiteGenerationContext } from '../site-project-generator'
import { bookThemeToTokensCss, type BookThemeFile } from '@emprint/shared'
import { createDefaultBookTheme } from './default-theme'
import componentsCssSource from './components.css?raw'

export function loadBookComponentsCss(): string {
  return componentsCssSource
}

export function createBookThemeJson(ctx: SiteGenerationContext): string {
  return JSON.stringify(createDefaultBookTheme(ctx), null, 2) + '\n'
}

export function createBookGlobalCss(): string {
  return `@import './tokens.css';
@import './components.css';
`
}

export { createDefaultBookTheme, bookThemeToTokensCss }
export type { BookThemeFile }
