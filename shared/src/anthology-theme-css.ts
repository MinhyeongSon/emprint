import type { AnthologyColorMode, AnthologyThemeColorTokens, AnthologyThemeFile, AnthologyThemeTokens } from './anthology-theme'

function cssVarName(classPrefix: string, parts: string[]): string {
  return `--${classPrefix}-${parts.join('-')}`
}

function emitColorBlock(classPrefix: string, selector: string, color: AnthologyThemeColorTokens): string {
  return [
    `${selector} {`,
    `  ${cssVarName(classPrefix, ['color', 'bg'])}: ${color.bg};`,
    `  ${cssVarName(classPrefix, ['color', 'surface'])}: ${color.surface};`,
    `  ${cssVarName(classPrefix, ['color', 'ink'])}: ${color.ink};`,
    `  ${cssVarName(classPrefix, ['color', 'muted'])}: ${color.muted};`,
    `  ${cssVarName(classPrefix, ['color', 'rule'])}: ${color.rule};`,
    `  ${cssVarName(classPrefix, ['color', 'accent'])}: ${color.accent};`,
    `  ${cssVarName(classPrefix, ['color', 'accent-soft'])}: ${color.accentSoft};`,
    '}'
  ].join('\n')
}

function emitStaticTokens(classPrefix: string, selector: string, tokens: AnthologyThemeTokens): string {
  return [
    `${selector} {`,
    `  ${cssVarName(classPrefix, ['font', 'sans'])}: ${tokens.font.sans};`,
    `  ${cssVarName(classPrefix, ['font', 'serif'])}: ${tokens.font.serif};`,
    `  ${cssVarName(classPrefix, ['font', 'mono'])}: ${tokens.font.mono};`,
    `  ${cssVarName(classPrefix, ['layout', 'measure'])}: ${tokens.layout.measure};`,
    `  ${cssVarName(classPrefix, ['layout', 'wide'])}: ${tokens.layout.wide};`,
    `  ${cssVarName(classPrefix, ['radius', 'sm'])}: ${tokens.radius.sm};`,
    `  ${cssVarName(classPrefix, ['radius', 'md'])}: ${tokens.radius.md};`,
    `  ${cssVarName(classPrefix, ['radius', 'pill'])}: ${tokens.radius.pill};`,
    '}'
  ].join('\n')
}

function indentMediaBlock(css: string): string {
  return css
    .split('\n')
    .map((line) => (line.length ? `  ${line}` : line))
    .join('\n')
}

export function normalizeAnthologyColorMode(value: unknown): AnthologyColorMode {
  if (value === 'light' || value === 'dark' || value === 'system') return value
  return 'system'
}

export function resolveAnthologyThemePalette(theme: AnthologyThemeFile): {
  light: AnthologyThemeColorTokens
  dark: AnthologyThemeColorTokens | null
} {
  const light = theme.tokens.color
  const darkPatch = theme.modes?.dark?.color
  return {
    light,
    dark: darkPatch ? { ...light, ...darkPatch } : null
  }
}

/** Emit `src/styles/tokens.css` for any anthology theme file. */
export function anthologyThemeToTokensCss(theme: AnthologyThemeFile): string {
  const defaultMode = normalizeAnthologyColorMode(theme.colorMode)
  const header = [
    '/*',
    ' * AUTO-GENERATED from config/theme.json',
    ' * Visitor theme: data-ep-color-mode on <html> (system | light | dark)',
    ` * Default when unset: ${defaultMode} (theme.json colorMode)`,
    ' * Component class names: docs/component-contract.md',
    ' */',
    ''
  ].join('\n')

  const classPrefix = theme.classPrefix
  const { light, dark } = resolveAnthologyThemePalette(theme)
  const blocks: string[] = [
    emitColorBlock(classPrefix, ':root', light),
    emitStaticTokens(classPrefix, ':root', theme.tokens)
  ]

  if (dark) {
    const systemSelectors = ':root:not([data-ep-color-mode]), :root[data-ep-color-mode="system"]'
    blocks.push(
      '',
      '@media (prefers-color-scheme: dark) {',
      indentMediaBlock(emitColorBlock(classPrefix, systemSelectors, dark)),
      '}',
      '',
      emitColorBlock(classPrefix, ':root[data-ep-color-mode="dark"]', dark),
      '',
      emitColorBlock(classPrefix, ':root[data-ep-color-mode="light"]', light),
      ':root[data-ep-color-mode="light"] { color-scheme: light; }',
      ':root[data-ep-color-mode="dark"] { color-scheme: dark; }'
    )
  }

  return header + blocks.join('\n') + '\n'
}
