import { useCallback, useEffect, useState } from 'react'
import {
  DEFAULT_MEMOIR_LAYOUT_COMPOSITION,
  inferMemoirLayoutComposition,
  parseMemoirThemeFile,
  type MemoirLayoutComposition
} from '@emprint/shared'
import { THEME_JSON_PATH } from '@renderer/features/design/design-workspace-paths'

export function useMemoirComposition(): {
  composition: MemoirLayoutComposition
  loading: boolean
  refresh: () => Promise<void>
} {
  const [composition, setComposition] = useState<MemoirLayoutComposition>(DEFAULT_MEMOIR_LAYOUT_COMPOSITION)
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
      const theme = parseMemoirThemeFile(res.content)
      setComposition(inferMemoirLayoutComposition(theme))
    } catch {
      setComposition(DEFAULT_MEMOIR_LAYOUT_COMPOSITION)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { composition, loading, refresh }
}
