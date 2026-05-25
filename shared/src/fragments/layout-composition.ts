/** Fragments public-site layout compositions (template variants). */

export type FragmentsLayoutCompositionId = 'lpShelf' | 'gallery'

export const DEFAULT_FRAGMENTS_LAYOUT_COMPOSITION: FragmentsLayoutCompositionId = 'lpShelf'

export const FRAGMENTS_LAYOUT_COMPOSITIONS: readonly {
  id: FragmentsLayoutCompositionId
  labelEn: string
  labelKo: string
  descriptionEn: string
  descriptionKo: string
}[] = [
  {
    id: 'lpShelf',
    labelEn: 'LP Shelf',
    labelKo: 'LP 선반',
    descriptionEn: 'Vinyl carousel with side preview — arrows rotate the disc.',
    descriptionKo: '원판 캐러셀과 우측 미리보기 — 화살표로 회전합니다.'
  },
  {
    id: 'gallery',
    labelEn: 'Gallery',
    labelKo: '갤러리',
    descriptionEn: 'Infinite scroll masonry — images pack by aspect ratio like a puzzle.',
    descriptionKo: '무한 스크롤 메이슨리 — 비율에 맞게 퍼즐처럼 맞춰집니다.'
  }
] as const

export function normalizeFragmentsLayoutComposition(
  value: unknown
): FragmentsLayoutCompositionId {
  if (value === 'lpShelf' || value === 'gallery') return value
  return DEFAULT_FRAGMENTS_LAYOUT_COMPOSITION
}

export function inferFragmentsLayoutComposition(
  value: unknown
): FragmentsLayoutCompositionId {
  return normalizeFragmentsLayoutComposition(value)
}
