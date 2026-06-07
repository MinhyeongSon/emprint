import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { logError, logInfo } from './log.mjs'

export function cssVar(prefix, parts) {
  return `--${prefix}-${parts.join('-')}`
}

export function emitColors(prefix, selector, color) {
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

export function emitStatic(prefix, selector, tokens) {
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

export function mergeColor(base, patch) {
  return { ...base, ...patch }
}

export function normalizeColorMode(value) {
  if (value === 'light' || value === 'dark' || value === 'system') return value
  return 'system'
}

export function resolvePalette(theme) {
  const light = theme.tokens.color
  const darkPatch = theme.modes?.dark?.color
  return {
    light,
    dark: darkPatch ? mergeColor(light, darkPatch) : null
  }
}

export function indentMediaBlock(css) {
  return css
    .split('\n')
    .map((line) => (line ? `  ${line}` : line))
    .join('\n')
}

export function emitDarkModeBlocks(classPrefix, light, dark) {
  if (!dark) return []
  const systemSelectors = ':root:not([data-ep-color-mode]), :root[data-ep-color-mode="system"]'
  return [
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
  ]
}

export function writeThemeTokensCss({ supportedAnthologies, classPrefixForAnthology, themeToCss }) {
  const root = process.cwd()
  const themePath = path.join(root, 'config', 'theme.json')
  const outDir = path.join(root, 'src', 'styles')
  const outPath = path.join(outDir, 'tokens.css')

  const raw = readFileSync(themePath, 'utf8')
  const theme = JSON.parse(raw)
  if (theme.contractVersion !== 1 || !supportedAnthologies.has(theme.anthology)) {
    logError(`Unsupported theme.json contract (anthology: ${theme.anthology ?? 'missing'}).`)
    process.exit(1)
  }
  theme.colorMode = normalizeColorMode(theme.colorMode)
  theme.classPrefix = classPrefixForAnthology(theme.anthology)
  mkdirSync(outDir, { recursive: true })
  writeFileSync(outPath, themeToCss(theme), 'utf8')
  logInfo(`Wrote src/styles/tokens.css (${theme.anthology})`)
}
