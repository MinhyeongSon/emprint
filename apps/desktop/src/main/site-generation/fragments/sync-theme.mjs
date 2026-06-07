/**
 * Workspace script: config/theme.json → src/styles/tokens.css (Fragments)
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { logError, logInfo } from '../shared/log.mjs'

const root = process.cwd()
const themePath = path.join(root, 'config', 'theme.json')
const outDir = path.join(root, 'src', 'styles')
const outPath = path.join(outDir, 'tokens.css')

const SUPPORTED = new Set(['fragments'])

function cssVar(prefix, parts) {
  return `--${prefix}-${parts.join('-')}`
}

function emitColors(prefix, selector, color) {
  const lines = [
    `${cssVar(prefix, ['color', 'bg'])}: ${color.bg};`,
    `${cssVar(prefix, ['color', 'surface'])}: ${color.surface};`,
    `${cssVar(prefix, ['color', 'ink'])}: ${color.ink};`,
    `${cssVar(prefix, ['color', 'muted'])}: ${color.muted};`,
    `${cssVar(prefix, ['color', 'rule'])}: ${color.rule};`,
    `${cssVar(prefix, ['color', 'accent'])}: ${color.accent};`,
    `${cssVar(prefix, ['color', 'accent-soft'])}: ${color.accentSoft};`
  ]
  if (color.shelf) lines.push(`${cssVar(prefix, ['color', 'shelf'])}: ${color.shelf};`)
  if (color.shelfShadow) lines.push(`${cssVar(prefix, ['color', 'shelf-shadow'])}: ${color.shelfShadow};`)
  return `${selector} {\n  ${lines.join('\n  ')}\n}`
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

const raw = readFileSync(themePath, 'utf8')
const theme = JSON.parse(raw)
if (!SUPPORTED.has(theme.anthology)) {
  logError('sync-theme: unsupported anthology', theme.anthology)
  process.exit(1)
}
const prefix = theme.classPrefix || 'ep-fragments'
const blocks = [
  `:root {`,
  `  ${cssVar(prefix, ['layout', 'composition'])}: ${theme.layoutComposition ?? 'lpShelf'};`,
  `}`,
  emitColors(prefix, ':root', theme.tokens.color),
  emitStatic(prefix, ':root', theme.tokens)
]
if (theme.modes?.dark?.color) {
  blocks.push(emitColors(prefix, "html[data-ep-color-mode='dark']", { ...theme.tokens.color, ...theme.modes.dark.color }))
}
mkdirSync(outDir, { recursive: true })
writeFileSync(outPath, `${blocks.join('\n\n')}\n`)
logInfo('synced theme tokens → src/styles/tokens.css')
