/**
 * Workspace script: config/theme.json → src/styles/tokens.css
 * Supports Column (`ep-column`) and Memoir (`ep-memoir`). See docs/component-contract.md
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const themePath = path.join(root, 'config', 'theme.json')
const outDir = path.join(root, 'src', 'styles')
const outPath = path.join(outDir, 'tokens.css')

const SUPPORTED_ANTHOLOGIES = new Set(['column', 'memoir'])

function cssVar(prefix, parts) {
  return `--${prefix}-${parts.join('-')}`
}

function emitColors(prefix, selector, color) {
  return `${selector} {
  ${cssVar(prefix, ['color', 'bg'])}: ${color.bg};
  ${cssVar(prefix, ['color', 'surface'])}: ${color.surface};
  ${cssVar(prefix, ['color', 'ink'])}: ${color.ink};
  ${cssVar(prefix, ['color', 'muted'])}: ${color.muted};
  ${cssVar(prefix, ['color', 'rule'])}: ${color.rule};
  ${cssVar(prefix, ['color', 'accent'])}: ${color.accent};
  ${cssVar(prefix, ['color', 'accent-soft'])}: ${color.accentSoft};
}`
}

function emitStatic(prefix, selector, tokens) {
  return `${selector} {
  ${cssVar(prefix, ['font', 'sans'])}: ${tokens.font.sans};
  ${cssVar(prefix, ['font', 'serif'])}: ${tokens.font.serif};
  ${cssVar(prefix, ['font', 'mono'])}: ${tokens.font.mono};
  ${cssVar(prefix, ['layout', 'measure'])}: ${tokens.layout.measure};
  ${cssVar(prefix, ['layout', 'wide'])}: ${tokens.layout.wide};
  ${cssVar(prefix, ['radius', 'sm'])}: ${tokens.radius.sm};
  ${cssVar(prefix, ['radius', 'md'])}: ${tokens.radius.md};
  ${cssVar(prefix, ['radius', 'pill'])}: ${tokens.radius.pill};
}`
}

function mergeColor(base, patch) {
  return { ...base, ...patch }
}

function normalizeColorMode(value) {
  if (value === 'light' || value === 'dark' || value === 'system') return value
  return 'system'
}

function resolvePalette(theme) {
  const light = theme.tokens.color
  const darkPatch = theme.modes?.dark?.color
  return {
    light,
    dark: darkPatch ? mergeColor(light, darkPatch) : null
  }
}

function indentMediaBlock(css) {
  return css
    .split('\n')
    .map((line) => (line ? `  ${line}` : line))
    .join('\n')
}

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

  if (dark) {
    const systemSelectors = ':root:not([data-ep-color-mode]), :root[data-ep-color-mode="system"]'
    blocks.push(
      '',
      '@media (prefers-color-scheme: dark) {',
      indentMediaBlock(emitColors(classPrefix, systemSelectors, dark)),
      '}',
      '',
      emitColors(classPrefix, ':root[data-ep-color-mode="dark"]', dark),
      '',
      emitColors(classPrefix, ':root[data-ep-color-mode="light"]', light),
      ':root[data-ep-color-mode="light"] { color-scheme: light; }',
      ':root[data-ep-color-mode="dark"] { color-scheme: dark; }'
    )
  }

  return header + blocks.join('\n') + '\n'
}

const raw = readFileSync(themePath, 'utf8')
const theme = JSON.parse(raw)
if (theme.contractVersion !== 1 || !SUPPORTED_ANTHOLOGIES.has(theme.anthology)) {
  console.error(`Unsupported theme.json contract (anthology: ${theme.anthology ?? 'missing'}).`)
  process.exit(1)
}
theme.colorMode = normalizeColorMode(theme.colorMode)
theme.classPrefix = normalizeClassPrefix(theme.anthology, theme.classPrefix)
mkdirSync(outDir, { recursive: true })
writeFileSync(outPath, themeToCss(theme), 'utf8')
console.log(`[emprint] Wrote src/styles/tokens.css (${theme.anthology})`)
