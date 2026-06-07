/**
 * Workspace script: config/theme.json → src/styles/tokens.css
 * Supports Dictionary (`ep-dictionary`). See docs/component-contract.md
 */
import {
  cssVar,
  emitColors,
  emitStatic,
  normalizeColorMode,
  resolvePalette,
  emitDarkModeBlocks,
  writeThemeTokensCss
} from '../shared/sync-theme-lib.mjs'

const SUPPORTED_ANTHOLOGIES = new Set(['dictionary'])
const CLASS_PREFIX = 'ep-dictionary'

/** Keep in sync with shared/src/dictionary/theme.ts COMPOSITION_LAYOUT */
const LAYOUT_BY_COMPOSITION = {
  reference: { measure: '42rem', wide: '76rem' },
  graph: { measure: '48rem', wide: 'min(96rem, 98vw)' },
  atlas: { measure: '44rem', wide: 'min(88rem, 96vw)' }
}

function normalizeComposition(value) {
  if (value === 'alphabet' || value === 'compact' || value === 'mindmap') {
    return 'reference'
  }
  if (value === 'reference' || value === 'graph' || value === 'atlas') {
    return value
  }
  return 'reference'
}

function themeToCss(theme) {
  const defaultMode = normalizeColorMode(theme.colorMode)
  const { light, dark } = resolvePalette(theme)
  const header = `/*
 * AUTO-GENERATED from config/theme.json
 * Visitor theme: data-ep-color-mode on <html> (system | light | dark)
 * Default when unset: ${defaultMode} (theme.json colorMode)
 * Component class names: docs/component-contract.md
 */

`
  const composition = normalizeComposition(theme.layoutComposition)
  theme.layoutComposition = composition
  theme.tokens.layout = LAYOUT_BY_COMPOSITION[composition]

  const blocks = [emitColors(CLASS_PREFIX, ':root', light), emitStatic(CLASS_PREFIX, ':root', theme.tokens)]
  blocks.push(`:root { ${cssVar(CLASS_PREFIX, ['layout', 'composition'])}: ${composition}; }`)
  blocks.push(...emitDarkModeBlocks(CLASS_PREFIX, light, dark))

  return header + blocks.join('\n') + '\n'
}

function buildThemeCss(theme) {
  theme.layoutComposition = normalizeComposition(theme.layoutComposition)
  theme.tokens.layout = LAYOUT_BY_COMPOSITION[theme.layoutComposition]
  return themeToCss(theme)
}

writeThemeTokensCss({
  supportedAnthologies: SUPPORTED_ANTHOLOGIES,
  classPrefixForAnthology: () => CLASS_PREFIX,
  themeToCss: buildThemeCss
})
