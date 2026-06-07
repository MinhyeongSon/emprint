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
import { LandingIntroPanel } from './landing-intro-panel'
import { TemplateCompositionCard, TemplatePaletteCard } from './template-composition-card'
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
      setError(pick(locale, 'Anthology site API unavailable.', '앤솔로지 사이트 API를 사용할 수 없습니다.'))
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
      setError(pick(locale, 'Anthology site API unavailable.', '앤솔로지 사이트 API를 사용할 수 없습니다.'))
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
      setError(pick(locale, 'Anthology API unavailable.', '앤솔로지 API를 사용할 수 없습니다.'))
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
      setError(pick(locale, 'Anthology API unavailable.', '앤솔로지 API를 사용할 수 없습니다.'))
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
      setError(pick(locale, 'Anthology site API unavailable.', '앤솔로지 사이트 API를 사용할 수 없습니다.'))
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
              {BOOK_LAYOUT_COMPOSITIONS.map((item) => (
                <TemplateCompositionCard
                  key={item.id}
                  selected={draftBookComposition === item.id}
                  siteKind="book"
                  compositionId={item.id}
                  title={locale === 'ko' ? item.labelKo : item.labelEn}
                  onSelect={() => setDraftBookComposition(item.id)}
                />
              ))}
            </div>
          </section>
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
              {pick(locale, 'Color palette', '색감')}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {COLOR_PALETTES.map((item) => (
                <TemplatePaletteCard
                  key={item.id}
                  selected={draftBookPreset === item.id}
                  paletteId={item.id}
                  title={locale === 'ko' ? item.labelKo : item.labelEn}
                  onSelect={() => setDraftBookPreset(item.id as BookThemePresetId)}
                />
              ))}
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
              {FRAGMENTS_LAYOUT_COMPOSITIONS.map((item) => (
                <TemplateCompositionCard
                  key={item.id}
                  selected={draftFragmentsComposition === item.id}
                  siteKind="fragments"
                  compositionId={item.id}
                  title={locale === 'ko' ? item.labelKo : item.labelEn}
                  onSelect={() => setDraftFragmentsComposition(item.id)}
                />
              ))}
            </div>
          </section>
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
              {pick(locale, 'Color palette', '색감')}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {COLOR_PALETTES.map((item) => (
                <TemplatePaletteCard
                  key={item.id}
                  selected={draftFragmentsPreset === item.id}
                  paletteId={item.id}
                  title={locale === 'ko' ? item.labelKo : item.labelEn}
                  onSelect={() => setDraftFragmentsPreset(item.id)}
                />
              ))}
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
              {LAYOUT_COMPOSITIONS.map((item) => (
                <TemplateCompositionCard
                  key={item.id}
                  selected={draftComposition === item.id}
                  siteKind="memoir"
                  compositionId={item.id}
                  title={locale === 'ko' ? item.labelKo : item.labelEn}
                  onSelect={() => setDraftComposition(item.id as LayoutCompositionId)}
                />
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
              {pick(locale, 'Color palette', '색감')}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {COLOR_PALETTES.map((item) => (
                <TemplatePaletteCard
                  key={item.id}
                  selected={draftPalette === item.id}
                  paletteId={item.id}
                  title={locale === 'ko' ? item.labelKo : item.labelEn}
                  onSelect={() => setDraftPalette(item.id as ColorPaletteId)}
                />
              ))}
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
          <DictionaryCompositionSections
            locale={locale}
            selected={draftDictionaryComposition}
            onSelect={setDraftDictionaryComposition}
          />

          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
              {pick(locale, 'Color palette', '색감')}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {COLOR_PALETTES.map((item) => (
                <TemplatePaletteCard
                  key={item.id}
                  selected={draftDictionaryPreset === item.id}
                  paletteId={item.id}
                  title={locale === 'ko' ? item.labelKo : item.labelEn}
                  onSelect={() => setDraftDictionaryPreset(item.id as DictionaryThemePresetId)}
                />
              ))}
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
              {COLUMN_LAYOUT_COMPOSITIONS.map((item) => (
                <TemplateCompositionCard
                  key={item.id}
                  selected={draftColumnComposition === item.id}
                  siteKind="column"
                  compositionId={item.id}
                  title={locale === 'ko' ? item.labelKo : item.labelEn}
                  onSelect={() => setDraftColumnComposition(item.id as ColumnLayoutCompositionId)}
                />
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
              {pick(locale, 'Color palette', '색감')}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {COLOR_PALETTES.map((item) => (
                <TemplatePaletteCard
                  key={item.id}
                  selected={draftColumnPreset === item.id}
                  paletteId={item.id}
                  title={locale === 'ko' ? item.labelKo : item.labelEn}
                  onSelect={() => setDraftColumnPreset(item.id)}
                />
              ))}
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

function DictionaryCompositionSections({
  locale,
  selected,
  onSelect
}: {
  locale: AppLocale
  selected: DictionaryLayoutComposition
  onSelect(id: DictionaryLayoutCompositionId): void
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
        {pick(locale, 'Layout', '레이아웃')}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {DICTIONARY_LAYOUT_COMPOSITIONS.map((item) => (
          <TemplateCompositionCard
            key={item.id}
            selected={selected === item.id}
            siteKind="dictionary"
            compositionId={item.id}
            title={locale === 'ko' ? item.labelKo : item.labelEn}
            onSelect={() => onSelect(item.id)}
          />
        ))}
      </div>
    </section>
  )
}
