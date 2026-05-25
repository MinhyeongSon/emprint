import { useCallback, useEffect, useState } from 'react'
import type {
  AppLocale,
  ColorPaletteId,
  ColumnLayoutComposition,
  ColumnLayoutCompositionId,
  ColumnThemePresetId,
  DictionaryLayoutComposition,
  DictionaryLayoutCompositionId,
  DictionaryThemePresetId,
  LayoutCompositionId,
  MemoirColorPaletteId,
  MemoirLayoutComposition,
  SiteProjectKind
} from '@emprint/shared'
import {
  buildColumnTheme,
  buildMemoirTheme,
  COLOR_PALETTES,
  COLUMN_LAYOUT_COMPOSITIONS,
  DEFAULT_COLUMN_LAYOUT_COMPOSITION,
  DEFAULT_COLUMN_THEME_PRESET_ID,
  DEFAULT_DICTIONARY_LAYOUT_COMPOSITION,
  DEFAULT_DICTIONARY_THEME_PRESET_ID,
  DEFAULT_MEMOIR_COLOR_PALETTE,
  DEFAULT_MEMOIR_LAYOUT_COMPOSITION,
  DICTIONARY_LAYOUT_COMPOSITIONS,
  normalizeSiteColorMode,
  inferColumnLayoutComposition,
  inferColumnThemePresetId,
  inferDictionaryLayoutComposition,
  inferDictionaryThemePresetId,
  inferMemoirColorPalette,
  inferMemoirLayoutComposition,
  LAYOUT_COMPOSITIONS,
  buildDictionaryTheme,
  buildFragmentsTheme,
  DEFAULT_FRAGMENTS_LAYOUT_COMPOSITION,
  FRAGMENTS_LAYOUT_COMPOSITIONS,
  inferFragmentsLayoutComposition,
  BOOK_LAYOUT_COMPOSITIONS,
  DEFAULT_BOOK_LAYOUT_COMPOSITION,
  buildBookTheme,
  inferBookLayoutComposition,
  inferBookThemePresetId,
  parseBookThemeFile,
  parseColumnThemeFile,
  parseDictionaryThemeFile,
  parseFragmentsThemeFile,
  parseMemoirThemeFile,
  serializeBookThemeFile,
  serializeColumnThemeFile,
  serializeDictionaryThemeFile,
  serializeFragmentsThemeFile,
  serializeMemoirThemeFile,
  inferFragmentsThemePresetId,
  type BookLayoutCompositionId,
  type BookThemePresetId,
  type FragmentsLayoutCompositionId,
  type FragmentsThemePresetId
} from '@emprint/shared'
import { Button } from '@renderer/components/ui/button'
import { Card } from '@renderer/components/ui/card'
import { cn } from '@renderer/lib/cn'
import { LandingIntroPanel } from './landing-intro-panel'
import { THEME_JSON_PATH } from './design-workspace-paths'
import { useAppStore } from '@renderer/state/app-store'
import { pick } from '@renderer/lib/i18n'
import type { SiteColorMode } from '@emprint/shared'

const DEFAULT_SITE_COLOR_MODE: SiteColorMode = 'system'

export function TemplateModePanel({ locale }: { locale: AppLocale }) {
  const bumpWorkspaceGitRefresh = useAppStore((state) => state.bumpWorkspaceGitRefresh)
  const workspaceConfig = useAppStore((state) => state.workspaceConfig)
  const workspaceResult = useAppStore((state) => state.workspaceResult)
  const siteKind: SiteProjectKind =
    workspaceConfig?.siteProjectKind ?? workspaceResult?.manifest.siteProjectKind ?? 'column'

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadingApplied, setLoadingApplied] = useState(true)

  const [appliedColumnComposition, setAppliedColumnComposition] = useState<ColumnLayoutComposition>(
    DEFAULT_COLUMN_LAYOUT_COMPOSITION
  )
  const [appliedColumnPreset, setAppliedColumnPreset] = useState<ColumnThemePresetId>(
    DEFAULT_COLUMN_THEME_PRESET_ID
  )
  const [draftColumnComposition, setDraftColumnComposition] = useState<ColumnLayoutComposition>(
    DEFAULT_COLUMN_LAYOUT_COMPOSITION
  )
  const [draftColumnPreset, setDraftColumnPreset] = useState<ColumnThemePresetId>(
    DEFAULT_COLUMN_THEME_PRESET_ID
  )

  const [appliedDictionaryComposition, setAppliedDictionaryComposition] =
    useState<DictionaryLayoutComposition>(DEFAULT_DICTIONARY_LAYOUT_COMPOSITION)
  const [appliedDictionaryPreset, setAppliedDictionaryPreset] = useState<DictionaryThemePresetId>(
    DEFAULT_DICTIONARY_THEME_PRESET_ID
  )
  const [draftDictionaryComposition, setDraftDictionaryComposition] = useState<DictionaryLayoutComposition>(
    DEFAULT_DICTIONARY_LAYOUT_COMPOSITION
  )
  const [draftDictionaryPreset, setDraftDictionaryPreset] = useState<DictionaryThemePresetId>(
    DEFAULT_DICTIONARY_THEME_PRESET_ID
  )

  const [appliedComposition, setAppliedComposition] = useState<MemoirLayoutComposition>(
    DEFAULT_MEMOIR_LAYOUT_COMPOSITION
  )
  const [appliedPalette, setAppliedPalette] = useState<MemoirColorPaletteId>(DEFAULT_MEMOIR_COLOR_PALETTE)

  const [draftComposition, setDraftComposition] = useState<MemoirLayoutComposition>(
    DEFAULT_MEMOIR_LAYOUT_COMPOSITION
  )
  const [draftPalette, setDraftPalette] = useState<MemoirColorPaletteId>(DEFAULT_MEMOIR_COLOR_PALETTE)

  const columnDirty =
    draftColumnComposition !== appliedColumnComposition || draftColumnPreset !== appliedColumnPreset

  const dictionaryDirty =
    draftDictionaryComposition !== appliedDictionaryComposition ||
    draftDictionaryPreset !== appliedDictionaryPreset

  const memoirDirty = draftComposition !== appliedComposition || draftPalette !== appliedPalette

  const [appliedFragmentsComposition, setAppliedFragmentsComposition] =
    useState<FragmentsLayoutCompositionId>(DEFAULT_FRAGMENTS_LAYOUT_COMPOSITION)
  const [draftFragmentsComposition, setDraftFragmentsComposition] =
    useState<FragmentsLayoutCompositionId>(DEFAULT_FRAGMENTS_LAYOUT_COMPOSITION)
  const [appliedFragmentsPreset, setAppliedFragmentsPreset] =
    useState<FragmentsThemePresetId>('emprint')
  const [draftFragmentsPreset, setDraftFragmentsPreset] = useState<FragmentsThemePresetId>('emprint')
  const fragmentsDirty =
    draftFragmentsPreset !== appliedFragmentsPreset ||
    draftFragmentsComposition !== appliedFragmentsComposition

  const [appliedBookComposition, setAppliedBookComposition] =
    useState<BookLayoutCompositionId>(DEFAULT_BOOK_LAYOUT_COMPOSITION)
  const [draftBookComposition, setDraftBookComposition] =
    useState<BookLayoutCompositionId>(DEFAULT_BOOK_LAYOUT_COMPOSITION)
  const [appliedBookPreset, setAppliedBookPreset] = useState<BookThemePresetId>('emprint')
  const [draftBookPreset, setDraftBookPreset] = useState<BookThemePresetId>('emprint')
  const bookDirty =
    draftBookComposition !== appliedBookComposition || draftBookPreset !== appliedBookPreset

  const loadAppliedTheme = useCallback(async () => {
    const api = window.emprint?.workspaceSrc
    if (!api?.read) {
      setLoadingApplied(false)
      return
    }
    setLoadingApplied(true)
    try {
      const res = await api.read({ path: THEME_JSON_PATH })
      if (siteKind === 'memoir') {
        const theme = parseMemoirThemeFile(res.content)
        const composition = inferMemoirLayoutComposition(theme)
        const palette = inferMemoirColorPalette(theme)
        setAppliedComposition(composition)
        setAppliedPalette(palette)
        setDraftComposition(composition)
        setDraftPalette(palette)
      } else if (siteKind === 'book') {
        const theme = parseBookThemeFile(res.content)
        const composition = inferBookLayoutComposition(theme.layoutComposition)
        const preset = inferBookThemePresetId(theme)
        setAppliedBookComposition(composition)
        setDraftBookComposition(composition)
        setAppliedBookPreset(preset)
        setDraftBookPreset(preset)
      } else if (siteKind === 'fragments') {
        const theme = parseFragmentsThemeFile(res.content)
        const preset = inferFragmentsThemePresetId(theme)
        const composition = inferFragmentsLayoutComposition(theme.layoutComposition)
        setAppliedFragmentsPreset(preset)
        setDraftFragmentsPreset(preset)
        setAppliedFragmentsComposition(composition)
        setDraftFragmentsComposition(composition)
      } else if (siteKind === 'dictionary') {
        const theme = parseDictionaryThemeFile(res.content)
        const composition = inferDictionaryLayoutComposition(theme)
        const preset = inferDictionaryThemePresetId(theme)
        setAppliedDictionaryComposition(composition)
        setAppliedDictionaryPreset(preset)
        setDraftDictionaryComposition(composition)
        setDraftDictionaryPreset(preset)
      } else {
        const theme = parseColumnThemeFile(res.content)
        const composition = inferColumnLayoutComposition(theme)
        const preset = inferColumnThemePresetId(theme)
        setAppliedColumnComposition(composition)
        setAppliedColumnPreset(preset)
        setDraftColumnComposition(composition)
        setDraftColumnPreset(preset)
      }
    } catch {
      if (siteKind === 'memoir') {
        setAppliedComposition(DEFAULT_MEMOIR_LAYOUT_COMPOSITION)
        setAppliedPalette(DEFAULT_MEMOIR_COLOR_PALETTE)
        setDraftComposition(DEFAULT_MEMOIR_LAYOUT_COMPOSITION)
        setDraftPalette(DEFAULT_MEMOIR_COLOR_PALETTE)
      } else if (siteKind === 'book') {
        setAppliedBookComposition(DEFAULT_BOOK_LAYOUT_COMPOSITION)
        setDraftBookComposition(DEFAULT_BOOK_LAYOUT_COMPOSITION)
        setAppliedBookPreset('emprint')
        setDraftBookPreset('emprint')
      } else if (siteKind === 'fragments') {
        setAppliedFragmentsPreset('emprint')
        setDraftFragmentsPreset('emprint')
        setAppliedFragmentsComposition(DEFAULT_FRAGMENTS_LAYOUT_COMPOSITION)
        setDraftFragmentsComposition(DEFAULT_FRAGMENTS_LAYOUT_COMPOSITION)
      } else if (siteKind === 'dictionary') {
        setAppliedDictionaryComposition(DEFAULT_DICTIONARY_LAYOUT_COMPOSITION)
        setAppliedDictionaryPreset(DEFAULT_DICTIONARY_THEME_PRESET_ID)
        setDraftDictionaryComposition(DEFAULT_DICTIONARY_LAYOUT_COMPOSITION)
        setDraftDictionaryPreset(DEFAULT_DICTIONARY_THEME_PRESET_ID)
      } else {
        setAppliedColumnComposition(DEFAULT_COLUMN_LAYOUT_COMPOSITION)
        setAppliedColumnPreset(DEFAULT_COLUMN_THEME_PRESET_ID)
        setDraftColumnComposition(DEFAULT_COLUMN_LAYOUT_COMPOSITION)
        setDraftColumnPreset(DEFAULT_COLUMN_THEME_PRESET_ID)
      }
    } finally {
      setLoadingApplied(false)
    }
  }, [siteKind])

  useEffect(() => {
    void loadAppliedTheme()
  }, [loadAppliedTheme])

  async function applyColumnTheme() {
    if (!columnDirty) return
    const api = window.emprint?.workspaceSrc
    if (!api?.save) {
      setError(pick(locale, 'Workspace source API unavailable.', '워크스페이스 소스 API를 사용할 수 없습니다.'))
      return
    }
    setBusy(true)
    setError(null)
    try {
      const built = buildColumnTheme(draftColumnComposition, draftColumnPreset)
      if (api.read) {
        try {
          const existing = parseColumnThemeFile((await api.read({ path: THEME_JSON_PATH })).content)
          if (existing.landingIntro) {
            built.landingIntro = existing.landingIntro
          }
          built.colorMode = normalizeSiteColorMode(existing.colorMode)
        } catch {
          built.colorMode = DEFAULT_SITE_COLOR_MODE
        }
      }
      await api.save({
        path: THEME_JSON_PATH,
        content: serializeColumnThemeFile(built)
      })
      bumpWorkspaceGitRefresh()
      setAppliedColumnComposition(draftColumnComposition)
      setAppliedColumnPreset(draftColumnPreset)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy(false)
    }
  }

  async function applyDictionaryTheme() {
    if (!dictionaryDirty) return
    const api = window.emprint?.workspaceSrc
    if (!api?.save) {
      setError(pick(locale, 'Workspace source API unavailable.', '워크스페이스 소스 API를 사용할 수 없습니다.'))
      return
    }
    setBusy(true)
    setError(null)
    try {
      const built = buildDictionaryTheme(draftDictionaryComposition, draftDictionaryPreset)
      if (api.read) {
        try {
          const existing = parseDictionaryThemeFile((await api.read({ path: THEME_JSON_PATH })).content)
          if (existing.landingIntro) {
            built.landingIntro = existing.landingIntro
          }
          built.colorMode = normalizeSiteColorMode(existing.colorMode)
        } catch {
          built.colorMode = DEFAULT_SITE_COLOR_MODE
        }
      }
      await api.save({
        path: THEME_JSON_PATH,
        content: serializeDictionaryThemeFile(built)
      })
      bumpWorkspaceGitRefresh()
      setAppliedDictionaryComposition(draftDictionaryComposition)
      setAppliedDictionaryPreset(draftDictionaryPreset)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy(false)
    }
  }

  async function applyBookTheme() {
    if (!bookDirty) return
    const api = window.emprint?.workspaceSrc
    if (!api?.save) {
      setError(pick(locale, 'Workspace API unavailable.', '워크스페이스 API를 사용할 수 없습니다.'))
      return
    }
    setBusy(true)
    setError(null)
    try {
      const built = buildBookTheme({
        presetId: draftBookPreset,
        layoutComposition: draftBookComposition
      })
      if (api.read) {
        try {
          const existing = parseBookThemeFile((await api.read({ path: THEME_JSON_PATH })).content)
          built.colorMode = normalizeSiteColorMode(existing.colorMode)
        } catch {
          built.colorMode = DEFAULT_SITE_COLOR_MODE
        }
      }
      await api.save({
        path: THEME_JSON_PATH,
        content: serializeBookThemeFile(built)
      })
      bumpWorkspaceGitRefresh()
      setAppliedBookComposition(draftBookComposition)
      setAppliedBookPreset(draftBookPreset)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy(false)
    }
  }

  async function applyFragmentsTheme() {
    if (!fragmentsDirty) return
    const api = window.emprint?.workspaceSrc
    if (!api?.save) {
      setError(pick(locale, 'Workspace API unavailable.', '워크스페이스 API를 사용할 수 없습니다.'))
      return
    }
    setBusy(true)
    setError(null)
    try {
      const built = buildFragmentsTheme({
        presetId: draftFragmentsPreset,
        layoutComposition: draftFragmentsComposition
      })
      if (api.read) {
        try {
          const existing = parseFragmentsThemeFile((await api.read({ path: THEME_JSON_PATH })).content)
          if (existing.landingIntro) {
            built.landingIntro = existing.landingIntro
          }
          built.colorMode = normalizeSiteColorMode(existing.colorMode)
        } catch {
          built.colorMode = DEFAULT_SITE_COLOR_MODE
        }
      }
      await api.save({
        path: THEME_JSON_PATH,
        content: serializeFragmentsThemeFile(built)
      })
      bumpWorkspaceGitRefresh()
      setAppliedFragmentsPreset(draftFragmentsPreset)
      setAppliedFragmentsComposition(draftFragmentsComposition)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy(false)
    }
  }

  async function applyMemoirTheme() {
    if (!memoirDirty) return
    const api = window.emprint?.workspaceSrc
    if (!api?.save) {
      setError(pick(locale, 'Workspace source API unavailable.', '워크스페이스 소스 API를 사용할 수 없습니다.'))
      return
    }
    setBusy(true)
    setError(null)
    try {
      const built = buildMemoirTheme(draftComposition, draftPalette)
      if (api.read) {
        try {
          const existing = parseMemoirThemeFile((await api.read({ path: THEME_JSON_PATH })).content)
          if (existing.landingIntro) {
            built.landingIntro = existing.landingIntro
          }
          built.colorMode = normalizeSiteColorMode(existing.colorMode)
        } catch {
          built.colorMode = DEFAULT_SITE_COLOR_MODE
        }
      }
      await api.save({
        path: THEME_JSON_PATH,
        content: serializeMemoirThemeFile(built)
      })
      bumpWorkspaceGitRefresh()
      setAppliedComposition(draftComposition)
      setAppliedPalette(draftPalette)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-[11px] uppercase tracking-[0.16em] text-muted">
          {pick(locale, 'Template', '템플릿')}
        </div>
        <p className="mt-1 text-sm text-muted">
          {siteKind === 'book'
            ? pick(
                locale,
                'Choose Pages (page-turn) or Scroll (continuous), then a color palette.',
                'Pages(넘기기) 또는 Scroll(스크롤) 레이아웃과 색감을 고릅니다.'
              )
            : siteKind === 'fragments'
            ? pick(
                locale,
                'Choose a public layout (LP Shelf or Gallery masonry), then a color palette.',
                '공개 레이아웃(LP 선반 또는 갤러리 메이슨리)과 색감을 고릅니다.'
              )
            : siteKind === 'memoir'
              ? pick(
                  locale,
                  'Choose how sections are composed on the page, then pick a color palette. Both are stored in config/theme.json.',
                  '페이지에서 섹션을 어떻게 배치할지(레이아웃 컴포지션)와 색감(팔레트)을 고릅니다. 둘 다 config/theme.json에 저장됩니다.'
                )
              : pick(
                  locale,
                  'Choose how posts are laid out on the homepage and archive, then pick a color palette. Both are stored in config/theme.json.',
                  '홈·아카이브에서 글 목록을 어떻게 배치할지(레이아웃 컴포지션)와 색감(팔레트)을 고릅니다. 둘 다 config/theme.json에 저장됩니다.'
                )}
        </p>
      </div>

      {error ? (
        <div className="rounded-md border border-danger/50 bg-dangerBg px-3 py-2 text-xs text-dangerInk">{error}</div>
      ) : null}

      {siteKind === 'book' ? (
        <>
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
              {pick(locale, 'Pages', 'Pages')}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {BOOK_LAYOUT_COMPOSITIONS.map((item) => {
                const selected = draftBookComposition === item.id
                return (
                  <Card
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setDraftBookComposition(item.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setDraftBookComposition(item.id)
                      }
                    }}
                    className={cn(
                      'cursor-pointer space-y-2 border p-4 transition outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
                      selected ? 'border-accent/50 bg-panel2/60' : 'border-border bg-panel hover:border-accent/30'
                    )}
                  >
                    <div className="text-sm font-semibold text-ink">
                      {locale === 'ko' ? item.labelKo : item.labelEn}
                    </div>
                    <p className="text-xs leading-relaxed text-muted">
                      {locale === 'ko' ? item.descriptionKo : item.descriptionEn}
                    </p>
                  </Card>
                )
              })}
            </div>
          </section>
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
              {pick(locale, 'Color palette', '색감')}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {COLOR_PALETTES.map((item) => {
                const selected = draftBookPreset === item.id
                return (
                  <Card
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setDraftBookPreset(item.id as BookThemePresetId)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setDraftBookPreset(item.id as BookThemePresetId)
                      }
                    }}
                    className={cn(
                      'cursor-pointer space-y-2 border p-4 transition outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
                      selected ? 'border-accent/50 bg-panel2/60' : 'border-border bg-panel hover:border-accent/30'
                    )}
                  >
                    <div className="text-sm font-semibold text-ink">
                      {locale === 'ko' ? item.labelKo : item.labelEn}
                    </div>
                    <p className="text-xs leading-relaxed text-muted">
                      {locale === 'ko' ? item.hintKo : item.hintEn}
                    </p>
                  </Card>
                )
              })}
            </div>
          </section>
          <Button
            type="button"
            className="w-full sm:w-auto"
            disabled={loadingApplied || busy || !bookDirty}
            onClick={() => void applyBookTheme()}
          >
            {busy
              ? pick(locale, 'Applying…', '적용 중…')
              : bookDirty
                ? pick(locale, 'Apply template', '템플릿 적용')
                : pick(locale, 'Applied', '적용됨')}
          </Button>
        </>
      ) : siteKind === 'fragments' ? (
        <>
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
              {pick(locale, 'Layout', '레이아웃')}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {FRAGMENTS_LAYOUT_COMPOSITIONS.map((item) => {
                const selected = draftFragmentsComposition === item.id
                return (
                  <Card
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setDraftFragmentsComposition(item.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setDraftFragmentsComposition(item.id)
                      }
                    }}
                    className={cn(
                      'cursor-pointer space-y-2 border p-4 transition outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
                      selected ? 'border-accent/50 bg-panel2/60' : 'border-border bg-panel hover:border-accent/30'
                    )}
                  >
                    <div className="text-sm font-semibold text-ink">
                      {locale === 'ko' ? item.labelKo : item.labelEn}
                    </div>
                    <p className="text-xs leading-relaxed text-muted">
                      {locale === 'ko' ? item.descriptionKo : item.descriptionEn}
                    </p>
                  </Card>
                )
              })}
            </div>
          </section>
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
              {pick(locale, 'Color palette', '색감')}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {COLOR_PALETTES.map((item) => {
                const selected = draftFragmentsPreset === item.id
                return (
                  <Card
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setDraftFragmentsPreset(item.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setDraftFragmentsPreset(item.id)
                      }
                    }}
                    className={cn(
                      'cursor-pointer space-y-2 border p-4 transition outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
                      selected ? 'border-accent/50 bg-panel2/60' : 'border-border bg-panel hover:border-accent/30'
                    )}
                  >
                    <div className="text-sm font-semibold text-ink">
                      {locale === 'ko' ? item.labelKo : item.labelEn}
                    </div>
                    <p className="text-xs leading-relaxed text-muted">
                      {locale === 'ko' ? item.hintKo : item.hintEn}
                    </p>
                  </Card>
                )
              })}
            </div>
          </section>
          <Button
            type="button"
            className="w-full sm:w-auto"
            disabled={loadingApplied || busy || !fragmentsDirty}
            onClick={() => void applyFragmentsTheme()}
          >
            {busy
              ? pick(locale, 'Applying…', '적용 중…')
              : fragmentsDirty
                ? pick(locale, 'Apply template', '템플릿 적용')
                : pick(locale, 'Applied', '적용됨')}
          </Button>
        </>
      ) : siteKind === 'memoir' ? (
        <>
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
              {pick(locale, 'Layout composition', '레이아웃 컴포지션')}
            </h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {LAYOUT_COMPOSITIONS.map((item) => {
                const selected = draftComposition === item.id
                return (
                  <Card
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setDraftComposition(item.id as LayoutCompositionId)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setDraftComposition(item.id as LayoutCompositionId)
                      }
                    }}
                    className={cn(
                      'cursor-pointer space-y-2 border p-4 transition outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
                      selected ? 'border-accent/50 bg-panel2/60' : 'border-border bg-panel hover:border-accent/30'
                    )}
                  >
                    <div className="text-sm font-semibold text-ink">
                      {locale === 'ko' ? item.labelKo : item.labelEn}
                    </div>
                    <p className="text-xs leading-relaxed text-muted">
                      {locale === 'ko' ? item.hintKo : item.hintEn}
                    </p>
                  </Card>
                )
              })}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
              {pick(locale, 'Color palette', '색감')}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {COLOR_PALETTES.map((item) => {
                const selected = draftPalette === item.id
                return (
                  <Card
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setDraftPalette(item.id as ColorPaletteId)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setDraftPalette(item.id as ColorPaletteId)
                      }
                    }}
                    className={cn(
                      'cursor-pointer space-y-2 border p-4 transition outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
                      selected ? 'border-accent/50 bg-panel2/60' : 'border-border bg-panel hover:border-accent/30'
                    )}
                  >
                    <div className="text-sm font-semibold text-ink">
                      {locale === 'ko' ? item.labelKo : item.labelEn}
                    </div>
                    <p className="text-xs leading-relaxed text-muted">
                      {locale === 'ko' ? item.hintKo : item.hintEn}
                    </p>
                  </Card>
                )
              })}
            </div>
          </section>
          <Button
            type="button"
            className="w-full sm:w-auto"
            disabled={loadingApplied || busy || !memoirDirty}
            onClick={() => void applyMemoirTheme()}
          >
            {busy
              ? pick(locale, 'Applying…', '적용 중…')
              : memoirDirty
                ? pick(locale, 'Apply layout & palette', '레이아웃·색감 적용')
                : pick(locale, 'Applied', '적용됨')}
          </Button>
        </>
      ) : siteKind === 'dictionary' ? (
        <>
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
              {pick(locale, 'Layout composition', '레이아웃 컴포지션')}
            </h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {DICTIONARY_LAYOUT_COMPOSITIONS.map((item) => {
                const selected = draftDictionaryComposition === item.id
                return (
                  <Card
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setDraftDictionaryComposition(item.id as DictionaryLayoutCompositionId)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setDraftDictionaryComposition(item.id as DictionaryLayoutCompositionId)
                      }
                    }}
                    className={cn(
                      'cursor-pointer space-y-2 border p-4 transition outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
                      selected ? 'border-accent/50 bg-panel2/60' : 'border-border bg-panel hover:border-accent/30'
                    )}
                  >
                    <div className="text-sm font-semibold text-ink">
                      {locale === 'ko' ? item.labelKo : item.labelEn}
                    </div>
                    <p className="text-xs leading-relaxed text-muted">
                      {locale === 'ko' ? item.hintKo : item.hintEn}
                    </p>
                  </Card>
                )
              })}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
              {pick(locale, 'Color palette', '색감')}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {COLOR_PALETTES.map((item) => {
                const selected = draftDictionaryPreset === item.id
                return (
                  <Card
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setDraftDictionaryPreset(item.id as DictionaryThemePresetId)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setDraftDictionaryPreset(item.id as DictionaryThemePresetId)
                      }
                    }}
                    className={cn(
                      'cursor-pointer space-y-2 border p-4 transition outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
                      selected ? 'border-accent/50 bg-panel2/60' : 'border-border bg-panel hover:border-accent/30'
                    )}
                  >
                    <div className="text-sm font-semibold text-ink">
                      {locale === 'ko' ? item.labelKo : item.labelEn}
                    </div>
                    <p className="text-xs leading-relaxed text-muted">
                      {locale === 'ko' ? item.hintKo : item.hintEn}
                    </p>
                  </Card>
                )
              })}
            </div>
          </section>
          <Button
            type="button"
            className="w-full sm:w-auto"
            disabled={loadingApplied || busy || !dictionaryDirty}
            onClick={() => void applyDictionaryTheme()}
          >
            {busy
              ? pick(locale, 'Applying…', '적용 중…')
              : dictionaryDirty
                ? pick(locale, 'Apply layout & palette', '레이아웃·색감 적용')
                : pick(locale, 'Applied', '적용됨')}
          </Button>
        </>
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
              {pick(locale, 'Layout composition', '레이아웃 컴포지션')}
            </h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {COLUMN_LAYOUT_COMPOSITIONS.map((item) => {
                const selected = draftColumnComposition === item.id
                return (
                  <Card
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setDraftColumnComposition(item.id as ColumnLayoutCompositionId)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setDraftColumnComposition(item.id as ColumnLayoutCompositionId)
                      }
                    }}
                    className={cn(
                      'cursor-pointer space-y-2 border p-4 transition outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
                      selected ? 'border-accent/50 bg-panel2/60' : 'border-border bg-panel hover:border-accent/30'
                    )}
                  >
                    <div className="text-sm font-semibold text-ink">
                      {locale === 'ko' ? item.labelKo : item.labelEn}
                    </div>
                    <p className="text-xs leading-relaxed text-muted">
                      {locale === 'ko' ? item.hintKo : item.hintEn}
                    </p>
                  </Card>
                )
              })}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
              {pick(locale, 'Color palette', '색감')}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {COLOR_PALETTES.map((item) => {
                const selected = draftColumnPreset === item.id
                return (
                  <Card
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setDraftColumnPreset(item.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setDraftColumnPreset(item.id)
                      }
                    }}
                    className={cn(
                      'cursor-pointer space-y-2 border p-4 transition outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
                      selected ? 'border-accent/50 bg-panel2/60' : 'border-border bg-panel hover:border-accent/30'
                    )}
                  >
                    <div className="text-sm font-semibold text-ink">
                      {locale === 'ko' ? item.labelKo : item.labelEn}
                    </div>
                    <p className="text-xs leading-relaxed text-muted">
                      {locale === 'ko' ? item.hintKo : item.hintEn}
                    </p>
                  </Card>
                )
              })}
            </div>
          </section>
          <Button
            type="button"
            className="w-full sm:w-auto"
            disabled={loadingApplied || busy || !columnDirty}
            onClick={() => void applyColumnTheme()}
          >
            {busy
              ? pick(locale, 'Applying…', '적용 중…')
              : columnDirty
                ? pick(locale, 'Apply layout & palette', '레이아웃·색감 적용')
                : pick(locale, 'Applied', '적용됨')}
          </Button>
        </>
      )}

      {siteKind !== 'book' ? <LandingIntroPanel locale={locale} /> : null}
    </div>
  )
}
