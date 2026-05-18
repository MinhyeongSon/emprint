/**
 * Layout composition — structural page arrangement shared across anthologies.
 * Color palettes are applied separately via theme tokens.
 */

export const LAYOUT_COMPOSITION_IDS = ['timeline', 'grid', 'editorial'] as const
export type LayoutCompositionId = (typeof LAYOUT_COMPOSITION_IDS)[number]

export interface LayoutCompositionMeta {
  id: LayoutCompositionId
  labelEn: string
  labelKo: string
  hintEn: string
  hintKo: string
}

export const LAYOUT_COMPOSITIONS: LayoutCompositionMeta[] = [
  {
    id: 'timeline',
    labelEn: 'Timeline',
    labelKo: '타임라인',
    hintEn: 'Projects stack vertically with a timeline rail — portfolio chronology.',
    hintKo: '프로젝트를 세로로 쌓고 타임라인 레일로 포트폴리오 흐름을 표현합니다.'
  },
  {
    id: 'grid',
    labelEn: 'Grid',
    labelKo: '그리드',
    hintEn: 'Projects render in a masonry grid — scan-friendly project wall.',
    hintKo: '프로젝트를 메이슨리 그리드로 배치해 한눈에 훑기 좋게 만듭니다.'
  },
  {
    id: 'editorial',
    labelEn: 'Editorial',
    labelKo: '에디토리얼',
    hintEn: 'Hero and the following Quote merge into one editorial lead block.',
    hintKo: '히어로와 바로 다음 인용문을 하나의 에디토리얼 리드 블록으로 합칩니다.'
  }
]

export function normalizeLayoutComposition(value: unknown): LayoutCompositionId {
  if (value === 'grid' || value === 'editorial' || value === 'timeline') return value
  return 'timeline'
}
