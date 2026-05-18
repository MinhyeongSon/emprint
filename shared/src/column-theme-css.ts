import type { ColumnThemeFile } from './column-theme'
import { COLUMN_CLASS_PREFIX, inferColumnLayoutComposition } from './column-theme'
import { anthologyThemeToTokensCss } from './anthology-theme-css'

/** Emit `src/styles/tokens.css` for Column theme files. */
export function columnThemeToTokensCss(theme: ColumnThemeFile): string {
  const composition = inferColumnLayoutComposition(theme)
  const base = anthologyThemeToTokensCss(theme).trimEnd()
  return `${base}\n:root {\n  --${COLUMN_CLASS_PREFIX}-layout-composition: ${composition};\n}\n`
}

/** @deprecated Use columnThemeToTokensCss */
export function themeToTokensCss(theme: ColumnThemeFile): string {
  return columnThemeToTokensCss(theme)
}
