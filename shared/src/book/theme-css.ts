import type { BookThemeFile } from './theme'
import { BOOK_CLASS_PREFIX } from './theme'
import { inferBookLayoutComposition } from './layout-composition'
import { anthologyThemeToTokensCss } from '../anthology/theme-css'

/** Emit `src/styles/tokens.css` for Book theme files. */
export function bookThemeToTokensCss(theme: BookThemeFile): string {
  const composition = inferBookLayoutComposition(theme)
  const base = anthologyThemeToTokensCss(theme).trimEnd()
  return `${base}\n:root {\n  --${BOOK_CLASS_PREFIX}-layout-composition: ${composition};\n}\n`
}
