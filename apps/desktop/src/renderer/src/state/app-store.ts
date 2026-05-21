import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type {
  AppLocale,
  InitializeWorkspaceResult,
  RuntimeDiagnostics,
  WorkspaceConfig,
  WorkspaceCatalogEntry
} from '@emprint/shared'
import { leaveAnthologySession } from '@renderer/lib/leave-anthology-session'

export type SidebarSection = 'posts' | 'drafts' | 'sections' | 'assets' | 'design' | 'imprint' | 'settings'

export type WorkspaceSurface = 'list' | 'viewer' | 'editor'

export type AppTheme = 'dark' | 'light' | 'warm'

function normalizeTheme(value: unknown): AppTheme {
  if (value === 'dark' || value === 'light' || value === 'warm') return value
  return 'warm'
}

function normalizeLocale(value: unknown): AppLocale {
  if (value === 'ko' || value === 'en') return value
  return 'en'
}

interface AppState {
  locale: AppLocale
  theme: AppTheme
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
  setTheme(theme: AppTheme): void
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
      theme: 'warm',
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
      setTheme: (theme) => set({ theme: normalizeTheme(theme) }),
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
          activeSection: kind === 'memoir' ? 'sections' : 'posts',
          surface: 'list',
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
        theme: state.theme,
        workspaceRootDir: state.workspaceRootDir,
        githubConnected: state.githubConnected,
        githubLogin: state.githubLogin
      }),
      storage: createJSONStorage(() => localStorage),
      merge: (persisted, current) => {
        const p = persisted as Partial<AppState> | undefined
        if (!p) return current
        return {
          ...current,
          ...p,
          locale: normalizeLocale(p.locale),
          theme: normalizeTheme(p.theme)
        }
      }
    }
  )
)
