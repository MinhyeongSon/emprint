/** Dictionary layout composition — structural homepage / index browse arrangement. */

export const DICTIONARY_LAYOUT_COMPOSITION_IDS = ['reference', 'alphabet', 'compact'] as const
export type DictionaryLayoutCompositionId = (typeof DICTIONARY_LAYOUT_COMPOSITION_IDS)[number]

export interface DictionaryLayoutCompositionMeta {
  id: DictionaryLayoutCompositionId
  labelEn: string
  labelKo: string
  hintEn: string
  hintKo: string
}

export const DICTIONARY_LAYOUT_COMPOSITIONS: DictionaryLayoutCompositionMeta[] = [
  {
    id: 'reference',
    labelEn: 'Reference',
    labelKo: 'Reference',
    hintEn: 'Clean reference layout — recent entries and index navigation.',
    hintKo: '깔끔한 참조형 레이아웃 — 최근 항목과 인덱스 내비게이션.'
  },
  {
    id: 'alphabet',
    labelEn: 'Alphabet',
    labelKo: 'Alphabet',
    hintEn: 'Index-first browse with grouped entry lists.',
    hintKo: '인덱스 중심 탐색과 묶인 항목 목록.'
  },
  {
    id: 'compact',
    labelEn: 'Compact',
    labelKo: 'Compact',
    hintEn: 'Dense lists for large knowledge bases.',
    hintKo: '큰 지식 베이스를 위한 밀집 목록.'
  }
]

export const DEFAULT_DICTIONARY_LAYOUT_COMPOSITION: DictionaryLayoutCompositionId = 'reference'

export function normalizeDictionaryLayoutComposition(value: unknown): DictionaryLayoutCompositionId {
  if (value === 'alphabet' || value === 'compact' || value === 'reference') return value
  return DEFAULT_DICTIONARY_LAYOUT_COMPOSITION
}
