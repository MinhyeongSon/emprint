import type { SiteGenerationContext } from '../site-project-generator'
import { createDefaultFragmentsTheme } from './default-theme'
import { fragmentsThemeToTokensCss, type FragmentsThemeFile } from '@emprint/shared'
import componentsCssSource from './components.css?raw'
import landingIntroCssTemplate from '../shared/landing-intro.css?raw'

function loadComponentsCss(): string {
  return componentsCssSource
}

export function createFragmentsThemeJson(ctx: SiteGenerationContext): string {
  return JSON.stringify(createDefaultFragmentsTheme(ctx), null, 2) + '\n'
}

export function createFragmentsGlobalCss(): string {
  return `@import './tokens.css';
@import './components.css';
@import './landing-intro.css';
`
}

export function loadLandingIntroCss(): string {
  return landingIntroCssTemplate.replaceAll('__PREFIX__', 'ep-fragments')
}

export { createDefaultFragmentsTheme, loadComponentsCss }
export type { FragmentsThemeFile }
