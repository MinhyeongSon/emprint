/** Dictionary layout composition — structural homepage / index browse arrangement. */

export const DICTIONARY_LAYOUT_COMPOSITION_IDS = ['reference', 'graph', 'atlas'] as const
export type DictionaryLayoutCompositionId = (typeof DICTIONARY_LAYOUT_COMPOSITION_IDS)[number]

export type DictionarySpatialCompositionId = 'graph' | 'atlas'

export interface DictionaryLayoutCompositionMeta {
  id: DictionaryLayoutCompositionId
  labelEn: string
  labelKo: string
  /** Which visitor route(s) this composition primarily shapes. */
  surfaceEn: string
  surfaceKo: string
  hintEn: string
  hintKo: string
}

export const DICTIONARY_LAYOUT_COMPOSITIONS: DictionaryLayoutCompositionMeta[] = [
  {
    id: 'reference',
    labelEn: 'Reference',
    labelKo: 'Reference',
    surfaceEn: 'Home + archive',
    surfaceKo: '홈 + 전체 목록',
    hintEn: 'Sidebar index + recent entries. Best default for mixed reading.',
    hintKo: '사이드 인덱스 + 최근 항목. 일반 읽기용 기본값.'
  },
  {
    id: 'graph',
    labelEn: 'Graph',
    labelKo: 'Graph',
    surfaceEn: 'Home',
    surfaceKo: '홈',
    hintEn: 'Link graph of topics and entries. Archive stays a reading list.',
    hintKo: '주제·항목 링크 그래프. 아카이브는 읽기 목록 유지.'
  },
  {
    id: 'atlas',
    labelEn: 'Atlas',
    labelKo: 'Atlas',
    surfaceEn: 'Home',
    surfaceKo: '홈',
    hintEn: 'Top-level topic tiles — domain map at a glance.',
    hintKo: '최상위 주제 타일 — 영역 지도.'
  }
]

export const DEFAULT_DICTIONARY_LAYOUT_COMPOSITION: DictionaryLayoutCompositionId = 'reference'

const VALID = new Set<string>(DICTIONARY_LAYOUT_COMPOSITION_IDS)

/** Maps legacy removed compositions (alphabet, compact, mindmap) to reference. */
export function normalizeDictionaryLayoutComposition(value: unknown): DictionaryLayoutCompositionId {
  if (value === 'alphabet' || value === 'compact' || value === 'mindmap') {
    return DEFAULT_DICTIONARY_LAYOUT_COMPOSITION
  }
  if (typeof value === 'string' && VALID.has(value)) {
    return value as DictionaryLayoutCompositionId
  }
  return DEFAULT_DICTIONARY_LAYOUT_COMPOSITION
}

export function isSpatialDictionaryComposition(
  value: DictionaryLayoutCompositionId
): value is DictionarySpatialCompositionId {
  return value === 'graph' || value === 'atlas'
}

export function isReadingListDictionaryComposition(value: DictionaryLayoutCompositionId): value is 'reference' {
  return value === 'reference'
}
