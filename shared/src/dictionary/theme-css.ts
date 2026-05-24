import type { DictionaryThemeFile } from './theme'
import { DICTIONARY_CLASS_PREFIX, inferDictionaryLayoutComposition } from './theme'
import { anthologyThemeToTokensCss } from '../anthology/theme-css'

/** Emit `src/styles/tokens.css` for Dictionary theme files. */
export function dictionaryThemeToTokensCss(theme: DictionaryThemeFile): string {
  const composition = inferDictionaryLayoutComposition(theme)
  const base = anthologyThemeToTokensCss(theme).trimEnd()
  return `${base}\n:root {\n  --${DICTIONARY_CLASS_PREFIX}-layout-composition: ${composition};\n}\n`
}
