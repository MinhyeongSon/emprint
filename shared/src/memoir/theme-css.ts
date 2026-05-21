import { anthologyThemeToTokensCss } from '../anthology/theme-css'
import { MEMOIR_CLASS_PREFIX, inferMemoirLayoutComposition, type MemoirThemeFile } from './theme'

/** Memoir tokens.css — base anthology tokens plus layout composition variable. */
export function memoirThemeToTokensCss(theme: MemoirThemeFile): string {
  const composition = inferMemoirLayoutComposition(theme)
  const base = anthologyThemeToTokensCss(theme).trimEnd()
  return `${base}\n:root {\n  --${MEMOIR_CLASS_PREFIX}-layout-composition: ${composition};\n}\n`
}
