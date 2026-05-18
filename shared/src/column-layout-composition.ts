/**
 * Column layout composition — structural homepage / archive arrangement.
 * Color presets are applied separately via theme tokens.
 */

export const COLUMN_LAYOUT_COMPOSITION_IDS = ['readingRoom', 'magazine', 'journal'] as const
export type ColumnLayoutCompositionId = (typeof COLUMN_LAYOUT_COMPOSITION_IDS)[number]

export interface ColumnLayoutCompositionMeta {
  id: ColumnLayoutCompositionId
  labelEn: string
  labelKo: string
  hintEn: string
  hintKo: string
}

export const COLUMN_LAYOUT_COMPOSITIONS: ColumnLayoutCompositionMeta[] = [
  {
    id: 'readingRoom',
    labelEn: 'Reading Room',
    labelKo: 'Reading Room',
    hintEn: 'Minimal homepage, focused typography, article-first, low navigation noise.',
    hintKo: '미니멀 홈, 타이포 중심, 글 읽기 우선, 낮은 내비게이션 노이즈.'
  },
  {
    id: 'magazine',
    labelEn: 'Magazine',
    labelKo: 'Magazine',
    hintEn: 'Featured hero post, two-column grid, trending and tags sidebar.',
    hintKo: '대표 글 히어로, 2열 그리드, 인기 글·태그 사이드바.'
  },
  {
    id: 'journal',
    labelEn: 'Journal',
    labelKo: 'Journal',
    hintEn: 'Posts grouped by year and month — archive diary rhythm.',
    hintKo: '연도·월별로 묶인 글 목록 — 저널 아카이브 리듬.'
  }
]

export const DEFAULT_COLUMN_LAYOUT_COMPOSITION: ColumnLayoutCompositionId = 'readingRoom'

export function normalizeColumnLayoutComposition(value: unknown): ColumnLayoutCompositionId {
  if (value === 'magazine' || value === 'journal' || value === 'readingRoom') return value
  return DEFAULT_COLUMN_LAYOUT_COMPOSITION
}
