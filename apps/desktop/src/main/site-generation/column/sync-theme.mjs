/**
 * Workspace script: config/theme.json → src/styles/tokens.css
 * Supports Column (`ep-column`) and Memoir (`ep-memoir`). See docs/component-contract.md
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

const SUPPORTED_ANTHOLOGIES = new Set(['column', 'memoir'])

function classPrefixForAnthology(anthology) {
  return anthology === 'memoir' ? 'ep-memoir' : 'ep-column'
}

function themeToCss(theme) {
  const anthology = theme.anthology === 'memoir' ? 'memoir' : 'column'
  const classPrefix = classPrefixForAnthology(anthology)
  const defaultMode = normalizeColorMode(theme.colorMode)
  const { light, dark } = resolvePalette(theme)
  const header = `/*
 * AUTO-GENERATED from config/theme.json
 * Visitor theme: data-ep-color-mode on <html> (system | light | dark)
 * Default when unset: ${defaultMode} (theme.json colorMode)
 * Component class names: docs/component-contract.md
 */

`
  const blocks = [emitColors(classPrefix, ':root', light), emitStatic(classPrefix, ':root', theme.tokens)]

  if (anthology === 'memoir') {
    let composition = theme.layoutComposition
    if (composition !== 'grid' && composition !== 'editorial' && composition !== 'timeline') {
      composition = 'timeline'
    }
    blocks.push(`:root { ${cssVar(classPrefix, ['layout', 'composition'])}: ${composition}; }`)
  }

  if (anthology === 'column') {
    let composition = theme.layoutComposition
    if (composition !== 'magazine' && composition !== 'journal' && composition !== 'readingRoom') {
      composition = 'readingRoom'
    }
    blocks.push(`:root { ${cssVar(classPrefix, ['layout', 'composition'])}: ${composition}; }`)
  }

  blocks.push(...emitDarkModeBlocks(classPrefix, light, dark))

  return header + blocks.join('\n') + '\n'
}

writeThemeTokensCss({
  supportedAnthologies: SUPPORTED_ANTHOLOGIES,
  classPrefixForAnthology,
  themeToCss
})
