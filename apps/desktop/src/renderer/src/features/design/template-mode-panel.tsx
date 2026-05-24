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
  inferColumnLayoutComposition,
  inferColumnThemePresetId,
  inferDictionaryLayoutComposition,
  inferDictionaryThemePresetId,
  inferMemoirColorPalette,
  inferMemoirLayoutComposition,
  LAYOUT_COMPOSITIONS,
  buildDictionaryTheme,
  parseColumnThemeFile,
  parseDictionaryThemeFile,
  parseMemoirThemeFile,
  serializeColumnThemeFile,
  serializeDictionaryThemeFile,
  serializeMemoirThemeFile
} from '@emprint/shared'
import { Button } from '@renderer/components/ui/button'
import { Card } from '@renderer/components/ui/card'
import { cn } from '@renderer/lib/cn'
import { LandingIntroPanel } from './landing-intro-panel'
import { THEME_JSON_PATH } from './design-workspace-paths'
import { useAppStore } from '@renderer/state/app-store'
import { pick } from '@renderer/lib/i18n'


const COLUMN_COLOR_PRESETS: {
  id: ColumnThemePresetId
  labelEn: string
  labelKo: string
  hintEn: string
  hintKo: string
}[] = [
  {
    id: 'emprint',
    labelEn: 'Emprint',
    labelKo: 'Emprint',
    hintEn: 'Warm paper and copper ink.',
    hintKo: '따뜻한 종이 톤과 구리빛 잉크.'
  },
  {
    id: 'paperInk',
    labelEn: 'Paper & Ink',
    labelKo: 'Paper & Ink',
    hintEn: 'Neutral editorial light and cool dark ink.',
    hintKo: '편집형 라이트와 차가운 다크 잉크.'
  }
]

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

  const memoirDirty =
    draftComposition !== appliedComposition || draftPalette !== appliedPalette

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
        } catch {
          /* keep preset default */
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
        } catch {
          /* keep preset default */
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
        } catch {
          /* keep preset default */
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
          {siteKind === 'memoir'
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

      {siteKind === 'memoir' ? (
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
              {COLUMN_COLOR_PRESETS.map((item) => {
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
              {COLUMN_COLOR_PRESETS.map((item) => {
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

      <LandingIntroPanel locale={locale} />
    </div>
  )
}
