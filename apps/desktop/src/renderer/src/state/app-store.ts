import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type {
  AppLocale,
  ColorPaletteId,
  InitializeWorkspaceResult,
  RuntimeDiagnostics,
  WorkspaceConfig,
  WorkspaceCatalogEntry
} from '@emprint/shared'
import type { AppColorScheme } from '@emprint/shared'
import { leaveAnthologySession } from '@renderer/lib/leave-anthology-session'

export type { AppColorScheme }
export type AppColorPalette = ColorPaletteId

/** @deprecated Replaced by colorPalette + colorScheme — migrated on rehydrate. */
type LegacyAppTheme = 'dark' | 'light' | 'warm'

export const DEFAULT_APP_COLOR_PALETTE: AppColorPalette = 'emprint'
export const DEFAULT_APP_COLOR_SCHEME: AppColorScheme = 'dark'

function normalizeColorPalette(value: unknown): AppColorPalette {
  if (value === 'emprint' || value === 'paperInk') return value
  return DEFAULT_APP_COLOR_PALETTE
}

function normalizeColorScheme(value: unknown): AppColorScheme {
  if (value === 'light' || value === 'dark') return value
  return DEFAULT_APP_COLOR_SCHEME
}

function migrateLegacyTheme(theme: unknown): { colorPalette: AppColorPalette; colorScheme: AppColorScheme } {
  if (theme === 'warm') return { colorPalette: 'emprint', colorScheme: 'dark' }
  if (theme === 'dark') return { colorPalette: 'paperInk', colorScheme: 'dark' }
  if (theme === 'light') return { colorPalette: 'paperInk', colorScheme: 'light' }
  return { colorPalette: DEFAULT_APP_COLOR_PALETTE, colorScheme: DEFAULT_APP_COLOR_SCHEME }
}

export type SidebarSection =
  | 'posts'
  | 'index'
  | 'knowledge'
  | 'drafts'
  | 'sections'
  | 'artwork'
  | 'story'
  | 'assets'
  | 'design'
  | 'imprint'
  | 'settings'

export type WorkspaceSurface = 'list' | 'viewer' | 'editor'

interface AppState {
  locale: AppLocale
  colorPalette: AppColorPalette
  colorScheme: AppColorScheme
  mode: 'wizard' | 'hub' | 'workspace'
  activeSection: SidebarSection
  surface: WorkspaceSurface
  activeDocumentPath?: string | undefined
  activeDocumentTitle?: string | undefined
  activeDocumentDirty: boolean
  runtimeInfo?: RuntimeDiagnostics
  workspaceRootDir?: string | undefined
  githubConnected: boolean
  githubLogin?: string | undefined
  workspaces: WorkspaceCatalogEntry[]
  activeWorkspaceId?: string | undefined
  workspaceConfig?: WorkspaceConfig | undefined
  workspaceResult?: InitializeWorkspaceResult | undefined
  hubRecovery: {
    workspaceId: string
    title: string
    message: string
    progress: number
  } | null
  hubCatalogRefreshToken: number
  /** Bumped when workspace files change on disk (save, design edit, publish, etc.). */
  workspaceGitRefreshToken: number
  setLocale(locale: AppLocale): void
  setColorPalette(colorPalette: AppColorPalette): void
  setColorScheme(colorScheme: AppColorScheme): void
  setRuntimeInfo(runtimeInfo: RuntimeDiagnostics): void
  setGithubSession(input: { connected: boolean; login?: string | undefined }): void
  setWorkspaceRootDir(dir?: string | undefined): void
  completeWizard(input: { workspaceRootDir: string; githubConnected: boolean }): void
  returnToWizard(): Promise<void>
  enterHub(): Promise<void>
  enterWorkspace(input: {
    workspaceId: string
    workspaceConfig: WorkspaceConfig
    workspaceResult: InitializeWorkspaceResult
  }): void
  setWorkspaces(entries: WorkspaceCatalogEntry[]): void
  setActiveWorkspaceId(id?: string | undefined): void
  setActiveSection(section: SidebarSection): void
  openDocument(path: string): void
  openEditor(path: string): void
  backToList(): void
  setActiveDocumentTitle(title?: string): void
  setActiveDocumentDirty(dirty: boolean): void
  startWorkspaceRecovery(workspaceId: string): Promise<void>
  setHubRecoveryProgress(input: { message: string; progress: number }): void
  finishHubRecovery(): void
  bumpHubCatalogRefresh(): void
  bumpWorkspaceGitRefresh(): void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      locale: 'en',
      colorPalette: DEFAULT_APP_COLOR_PALETTE,
      colorScheme: DEFAULT_APP_COLOR_SCHEME,
      mode: 'wizard',
      activeSection: 'posts',
      surface: 'list',
      activeDocumentTitle: undefined,
      activeDocumentDirty: false,
      workspaceRootDir: undefined,
      githubConnected: false,
      githubLogin: undefined,
      workspaces: [],
      activeWorkspaceId: undefined,
      hubRecovery: null,
      hubCatalogRefreshToken: 0,
      workspaceGitRefreshToken: 0,
      setLocale: (locale) => set({ locale: normalizeLocale(locale) }),
      setColorPalette: (colorPalette) => set({ colorPalette: normalizeColorPalette(colorPalette) }),
      setColorScheme: (colorScheme) => set({ colorScheme: normalizeColorScheme(colorScheme) }),
      setRuntimeInfo: (runtimeInfo) => set({ runtimeInfo }),
      setGithubSession: ({ connected, login }) => set({ githubConnected: connected, githubLogin: login }),
      setWorkspaceRootDir: (workspaceRootDir) => set({ workspaceRootDir }),
      completeWizard: ({ workspaceRootDir, githubConnected }) =>
        set((state) => ({
          mode: 'hub',
          workspaceRootDir,
          githubConnected,
          hubCatalogRefreshToken: state.hubCatalogRefreshToken + 1
        })),
      returnToWizard: async () => {
        await leaveAnthologySession()
        set({
          mode: 'wizard',
          githubConnected: false,
          githubLogin: undefined,
          activeWorkspaceId: undefined,
          workspaceConfig: undefined,
          workspaceResult: undefined,
          activeSection: 'posts',
          surface: 'list',
          activeDocumentPath: undefined,
          activeDocumentTitle: undefined,
          activeDocumentDirty: false
        })
      },
      enterHub: async () => {
        await leaveAnthologySession()
        set({
          mode: 'hub',
          activeWorkspaceId: undefined,
          workspaceConfig: undefined,
          workspaceResult: undefined,
          activeSection: 'posts',
          surface: 'list',
          activeDocumentPath: undefined,
          activeDocumentTitle: undefined,
          activeDocumentDirty: false
        })
      },
      enterWorkspace: ({ workspaceId, workspaceConfig, workspaceResult }) => {
        const kind =
          workspaceConfig.siteProjectKind ?? workspaceResult.manifest.siteProjectKind ?? 'column'
        return set({
          mode: 'workspace',
          activeWorkspaceId: workspaceId,
          workspaceConfig,
          workspaceResult,
          activeSection:
            kind === 'memoir'
              ? 'sections'
              : kind === 'dictionary'
                ? 'index'
                : kind === 'fragments'
                  ? 'artwork'
                  : kind === 'book'
                    ? 'story'
                    : 'posts',
          surface: kind === 'book' ? 'editor' : 'list',
          activeDocumentPath: undefined,
          activeDocumentTitle: undefined,
          activeDocumentDirty: false
        })
      },
      setWorkspaces: (workspaces) => set({ workspaces }),
      setActiveWorkspaceId: (activeWorkspaceId) => set({ activeWorkspaceId }),
      setActiveSection: (activeSection) =>
        set({
          activeSection,
          surface: 'list',
          activeDocumentPath: undefined,
          activeDocumentTitle: undefined,
          activeDocumentDirty: false
        }),
      openDocument: (activeDocumentPath) => set({ activeDocumentPath, surface: 'viewer', activeDocumentDirty: false }),
      openEditor: (activeDocumentPath) => set({ activeDocumentPath, surface: 'editor', activeDocumentDirty: false }),
      backToList: () => set({ surface: 'list', activeDocumentPath: undefined, activeDocumentTitle: undefined, activeDocumentDirty: false }),
      setActiveDocumentTitle: (activeDocumentTitle) => set({ activeDocumentTitle }),
      setActiveDocumentDirty: (activeDocumentDirty) => set({ activeDocumentDirty }),
      startWorkspaceRecovery: async (workspaceId) => {
        const entry = get().workspaces.find((w) => w.id === workspaceId)
        await leaveAnthologySession()
        set({
          mode: 'hub',
          hubRecovery: {
            workspaceId,
            title: entry?.title ?? 'Workspace',
            message: 'Preparing recovery…',
            progress: 0
          },
          activeWorkspaceId: undefined,
          workspaceConfig: undefined,
          workspaceResult: undefined,
          activeSection: 'posts',
          surface: 'list',
          activeDocumentPath: undefined,
          activeDocumentTitle: undefined,
          activeDocumentDirty: false
        })
      },
      setHubRecoveryProgress: ({ message, progress }) =>
        set((state) =>
          state.hubRecovery
            ? { hubRecovery: { ...state.hubRecovery, message, progress } }
            : {}
        ),
      finishHubRecovery: () => set({ hubRecovery: null }),
      bumpHubCatalogRefresh: () => set((state) => ({ hubCatalogRefreshToken: state.hubCatalogRefreshToken + 1 })),
      bumpWorkspaceGitRefresh: () =>
        set((state) => ({ workspaceGitRefreshToken: state.workspaceGitRefreshToken + 1 }))
    }),
    {
      name: 'emprint-preferences',
      partialize: (state) => ({
        mode: state.mode === 'workspace' ? 'hub' : state.mode,
        locale: state.locale,
        colorPalette: state.colorPalette,
        colorScheme: state.colorScheme,
        workspaceRootDir: state.workspaceRootDir,
        githubConnected: state.githubConnected,
        githubLogin: state.githubLogin
      }),
      storage: createJSONStorage(() => localStorage),
      merge: (persisted, current) => {
        const p = persisted as (Partial<AppState> & { theme?: LegacyAppTheme }) | undefined
        if (!p) return current
        const migrated = p.theme !== undefined ? migrateLegacyTheme(p.theme) : null
        return {
          ...current,
          ...p,
          locale: normalizeLocale(p.locale),
          colorPalette: normalizeColorPalette(p.colorPalette ?? migrated?.colorPalette),
          colorScheme: normalizeColorScheme(p.colorScheme ?? migrated?.colorScheme)
        }
      }
    }
  )
)

function normalizeLocale(value: unknown): AppLocale {
  if (value === 'ko' || value === 'en') return value
  return 'en'
}
