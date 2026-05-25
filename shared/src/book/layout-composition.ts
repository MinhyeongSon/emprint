/** Book public-site layout: paginated pages vs continuous scroll. */

export type BookLayoutCompositionId = 'pages' | 'scroll'

export const DEFAULT_BOOK_LAYOUT_COMPOSITION: BookLayoutCompositionId = 'pages'

export const BOOK_LAYOUT_COMPOSITIONS: readonly {
  id: BookLayoutCompositionId
  labelEn: string
  labelKo: string
  descriptionEn: string
  descriptionKo: string
}[] = [
  {
    id: 'pages',
    labelEn: 'Pages',
    labelKo: 'Pages',
    descriptionEn: 'Turn through the story one page at a time with a page-flip animation.',
    descriptionKo: '종이를 넘기듯 한 장씩 페이지를 넘기며 읽습니다.'
  },
  {
    id: 'scroll',
    labelEn: 'Scroll',
    labelKo: 'Scroll',
    descriptionEn: 'One continuous column — scroll through the full story.',
    descriptionKo: '아래로 스크롤하며 전체 이야기를 이어서 봅니다.'
  }
] as const

export type BookLayoutComposition = BookLayoutCompositionId

export function normalizeBookLayoutComposition(value: unknown): BookLayoutCompositionId {
  if (value === 'pages' || value === 'scroll') return value
  return DEFAULT_BOOK_LAYOUT_COMPOSITION
}

export function inferBookLayoutComposition(value: unknown): BookLayoutCompositionId {
  return normalizeBookLayoutComposition(value)
}
