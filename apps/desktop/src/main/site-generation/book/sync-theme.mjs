/**
 * Workspace script: config/theme.json → src/styles/tokens.css (Book)
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const themePath = path.join(root, 'config', 'theme.json')
const outDir = path.join(root, 'src', 'styles')
const outPath = path.join(outDir, 'tokens.css')

const PREFIX = 'ep-book'

function cssVar(parts) {
  return `--${PREFIX}-${parts.join('-')}`
}

function emitColors(selector, color) {
  return `${selector} {
  ${cssVar(['color', 'bg'])}: ${color.bg};
  ${cssVar(['color', 'surface'])}: ${color.surface};
  ${cssVar(['color', 'ink'])}: ${color.ink};
  ${cssVar(['color', 'muted'])}: ${color.muted};
  ${cssVar(['color', 'rule'])}: ${color.rule};
  ${cssVar(['color', 'accent'])}: ${color.accent};
  ${cssVar(['color', 'accent-soft'])}: ${color.accentSoft};
}`
}

function emitStatic(selector, tokens) {
  return `${selector} {
  ${cssVar(['font', 'sans'])}: ${tokens.font.sans};
  ${cssVar(['font', 'serif'])}: ${tokens.font.serif};
  ${cssVar(['font', 'mono'])}: ${tokens.font.mono};
  ${cssVar(['layout', 'measure'])}: ${tokens.layout.measure};
  ${cssVar(['layout', 'wide'])}: ${tokens.layout.wide};
  ${cssVar(['radius', 'sm'])}: ${tokens.radius.sm};
  ${cssVar(['radius', 'md'])}: ${tokens.radius.md};
  ${cssVar(['radius', 'pill'])}: ${tokens.radius.pill};
}`
}

function mergeColor(base, patch) {
  return { ...base, ...patch }
}

function normalizeColorMode(value) {
  if (value === 'light' || value === 'dark' || value === 'system') return value
  return 'system'
}

function normalizeComposition(value) {
  return value === 'scroll' ? 'scroll' : 'pages'
}

function themeToCss(theme) {
  const light = theme.tokens.color
  const darkPatch = theme.modes?.dark?.color
  const dark = darkPatch ? mergeColor(light, darkPatch) : null
  const composition = normalizeComposition(theme.layoutComposition)
  const defaultMode = normalizeColorMode(theme.colorMode)

  const header = `/*
 * AUTO-GENERATED from config/theme.json (book)
 * Visitor theme: data-ep-color-mode on <html>
 * Default: ${defaultMode}
 */

`
  const blocks = [emitColors(':root', light), emitStatic(':root', theme.tokens), `:root { ${cssVar(['layout', 'composition'])}: ${composition}; }`]

  if (dark) {
    const systemSelectors = ':root:not([data-ep-color-mode]), :root[data-ep-color-mode="system"]'
    blocks.push(
      '',
      '@media (prefers-color-scheme: dark) {',
      systemSelectors.split(',').map((s) => `  ${emitColors(s.trim(), dark)}`).join('\n'),
      '}',
      '',
      emitColors(':root[data-ep-color-mode="dark"]', dark),
      '',
      emitColors(':root[data-ep-color-mode="light"]', light)
    )
  }

  return header + blocks.join('\n') + '\n'
}

const raw = readFileSync(themePath, 'utf8')
const theme = JSON.parse(raw)
if (theme.contractVersion !== 1 || theme.anthology !== 'book') {
  console.error(`Unsupported theme.json for Book (anthology: ${theme.anthology ?? 'missing'}).`)
  process.exit(1)
}
theme.colorMode = normalizeColorMode(theme.colorMode)
mkdirSync(outDir, { recursive: true })
writeFileSync(outPath, themeToCss(theme), 'utf8')
console.log('[emprint] Wrote src/styles/tokens.css (book)')
