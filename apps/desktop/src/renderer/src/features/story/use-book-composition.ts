import { useCallback, useEffect, useState } from 'react'
import {
  DEFAULT_BOOK_LAYOUT_COMPOSITION,
  inferBookLayoutComposition,
  parseBookThemeFile,
  type BookLayoutCompositionId
} from '@emprint/shared'
import { THEME_JSON_PATH } from '@renderer/features/design/design-workspace-paths'

export function useBookComposition(): {
  composition: BookLayoutCompositionId
  loading: boolean
  refresh: () => Promise<void>
} {
  const [composition, setComposition] = useState<BookLayoutCompositionId>(DEFAULT_BOOK_LAYOUT_COMPOSITION)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const api = window.emprint?.workspaceSrc
    if (!api?.read) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res = await api.read({ path: THEME_JSON_PATH })
      const theme = parseBookThemeFile(res.content)
      setComposition(inferBookLayoutComposition(theme.layoutComposition))
    } catch {
      setComposition(DEFAULT_BOOK_LAYOUT_COMPOSITION)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { composition, loading, refresh }
}
