import type { AnthologyThemeFile } from '../anthology/theme'
import { anthologyThemeToTokensCss } from '../anthology/theme-css'
import type { FragmentsThemeColorTokens, FragmentsThemeFile } from './theme'

function cssVarName(classPrefix: string, parts: string[]): string {
  return `--${classPrefix}-${parts.join('-')}`
}

function emitShelfBlock(
  classPrefix: string,
  selector: string,
  color: Pick<FragmentsThemeColorTokens, 'shelf' | 'shelfShadow'>
): string {
  return [
    `${selector} {`,
    `  ${cssVarName(classPrefix, ['color', 'shelf'])}: ${color.shelf};`,
    `  ${cssVarName(classPrefix, ['color', 'shelf-shadow'])}: ${color.shelfShadow};`,
    '}'
  ].join('\n')
}

function indentBlock(css: string): string {
  return css
    .split('\n')
    .map((line) => (line.length ? `  ${line}` : line))
    .join('\n')
}

function fragmentsShelfColors(theme: FragmentsThemeFile): {
  light: Pick<FragmentsThemeColorTokens, 'shelf' | 'shelfShadow'>
  dark: Pick<FragmentsThemeColorTokens, 'shelf' | 'shelfShadow'> | null
} {
  const light = {
    shelf: theme.tokens.color.shelf,
    shelfShadow: theme.tokens.color.shelfShadow
  }
  const patch = theme.modes?.dark?.color
  if (!patch) return { light, dark: null }
  return {
    light,
    dark: {
      shelf: patch.shelf ?? light.shelf,
      shelfShadow: patch.shelfShadow ?? light.shelfShadow
    }
  }
}

/** Strip Fragments-only shelf fields for shared anthology CSS emission. */
function fragmentsAsAnthologyTheme(theme: FragmentsThemeFile): AnthologyThemeFile {
  const { shelf: _s, shelfShadow: _ss, ...lightColor } = theme.tokens.color
  const darkPatch = theme.modes?.dark?.color
  let modes: AnthologyThemeFile['modes'] | undefined
  if (darkPatch) {
    const { shelf: _ds, shelfShadow: _dss, ...darkColor } = { ...theme.tokens.color, ...darkPatch }
    modes = { dark: { color: darkColor } }
  }
  return {
    contractVersion: 1,
    anthology: 'fragments',
    classPrefix: theme.classPrefix,
    ...(theme.colorMode !== undefined ? { colorMode: theme.colorMode } : {}),
    tokens: {
      color: lightColor,
      font: theme.tokens.font,
      layout: theme.tokens.layout,
      radius: theme.tokens.radius
    },
    ...(modes !== undefined ? { modes } : {}),
    ...(theme.landingIntro !== undefined ? { landingIntro: theme.landingIntro } : {})
  }
}

/** Emit `src/styles/tokens.css` for Fragments (anthology visitor theme + shelf tokens). */
export function fragmentsThemeToTokensCss(theme: FragmentsThemeFile): string {
  const p = theme.classPrefix
  const base = anthologyThemeToTokensCss(fragmentsAsAnthologyTheme(theme)).trimEnd()
  const { light, dark } = fragmentsShelfColors(theme)
  const blocks = ['', emitShelfBlock(p, ':root', light)]

  if (dark) {
    const systemSelectors = ':root:not([data-ep-color-mode]), :root[data-ep-color-mode="system"]'
    blocks.push(
      '',
      '@media (prefers-color-scheme: dark) {',
      indentBlock(emitShelfBlock(p, systemSelectors, dark)),
      '}',
      '',
      emitShelfBlock(p, ':root[data-ep-color-mode="dark"]', dark)
    )
  }

  blocks.push('', `:root {`, `  --${p}-layout-composition: ${theme.layoutComposition ?? 'lpShelf'};`, '}')
  return `${base}${blocks.join('\n')}\n`
}
