import type {
  AssetImageInfo,
  DirectorySelectionResult,
  GitCommitNode,
  GitHubAuthStatus,
  GitHubDeviceCode,
  GitHubOAuthClientConfig,
  GitHubRepoCreateInput,
  GitHubRepoCreateResult,
  GitDetectResult,
  GitInitialSyncResult,
  GitLogInput,
  GitPublishInput,
  GitPublishResult,
  GitPullInput,
  GitPullResult,
  GitRecoverWorkspaceInput,
  GitRecoverWorkspaceProgress,
  GitRecoverWorkspaceResult,
  GitWorkingTreeSummary,
  InitializeWorkspaceResult,
  PostSummary,
  RuntimeDiagnostics,
  WorkspaceCatalogEntry,
  SiteDevServerState,
  WorkspaceConfig,
  WorkspaceMonacoTypescriptPayload,
  WorkspaceSrcTreeNode,
} from './types'

export const ipcChannels = {
  systemGetRuntimeInfo: 'system:get-runtime-info',
  systemSelectDirectory: 'system:select-directory',
  githubOAuthClientGet: 'github:oauth-client:get',
  githubOAuthClientSet: 'github:oauth-client:set',
  githubAuthStatus: 'github:auth:status',
  githubAuthStart: 'github:auth:start',
  githubAuthPoll: 'github:auth:poll',
  githubLogout: 'github:logout',
  githubRepoCreate: 'github:repo:create',
  workspaceInitialize: 'workspace:initialize',
  workspaceOpen: 'workspace:open',
  gitInitialSync: 'git:initial-sync',
  gitDetect: 'git:detect',
  gitWorkingTree: 'git:working-tree',
  gitPull: 'git:pull',
  gitRecoverWorkspace: 'git:recover-workspace',
  gitRecoverWorkspaceProgress: 'git:recover-workspace:progress',
  gitPublish: 'git:publish',
  gitLog: 'git:log',
  postsList: 'posts:list',
  postRead: 'post:read',
  postSave: 'post:save',
  postsMove: 'posts:move',
  postsDelete: 'posts:delete',
  workspaceSrcListTree: 'workspace:src:list-tree',
  workspaceSrcRead: 'workspace:src:read',
  workspaceSrcSave: 'workspace:src:save',
  workspaceSrcCreate: 'workspace:src:create',
  workspaceSrcRename: 'workspace:src:rename',
  workspaceSrcDelete: 'workspace:src:delete',
  assetsSaveImage: 'assets:save-image',
  assetsListImages: 'assets:list-images',
  assetsDeleteImage: 'assets:delete-image',
  catalogList: 'catalog:list',
  catalogAdd: 'catalog:add',
  catalogRemove: 'catalog:remove',
  windowMinimize: 'window:minimize',
  windowToggleMaximize: 'window:toggle-maximize',
  windowClose: 'window:close',
  windowIsMaximized: 'window:is-maximized',
  siteDevStop: 'site:dev:stop',
  siteDevStatus: 'site:dev:status',
  siteDevOpenPreview: 'site:dev:open-preview',
  workspaceMonacoTypescript: 'workspace:monaco:typescript',
  /** Main cleared GitHub session (e.g. logout from native close dialog). */
  githubSessionCleared: 'github:session-cleared'
} as const

export interface EmprintDesktopApi {
  /** Sync OS/platform from the main process (preload); avoids titlebar flicker before `getRuntimeInfo` resolves */
  env: {
    platform: string
  }
  system: {
    getRuntimeInfo(): Promise<RuntimeDiagnostics>
    selectDirectory(): Promise<DirectorySelectionResult | null>
  }
  github: {
    oauthClientGet(): Promise<GitHubOAuthClientConfig>
    oauthClientSet(input: { clientId: string; clientSecret?: string }): Promise<GitHubOAuthClientConfig>
    authStatus(): Promise<GitHubAuthStatus>
    authStart(input: { scopes: string[] }): Promise<GitHubDeviceCode>
    authPoll(input: { deviceCode: string }): Promise<GitHubAuthStatus>
    logout(): Promise<void>
    repoCreate(input: GitHubRepoCreateInput): Promise<GitHubRepoCreateResult>
  }
  workspace: {
    initialize(config: WorkspaceConfig): Promise<InitializeWorkspaceResult>
    open(input: { localDirectory: string }): Promise<InitializeWorkspaceResult>
  }
  git: {
    initialSync(input: { directory: string; remoteUrl?: string; branch?: string }): Promise<GitInitialSyncResult>
    detect(): Promise<GitDetectResult>
    /**
     * Inspect the currently mounted workspace's working tree, branch, and
     * remote relationship. Used by the sidebar publish button and the publish
     * dialog. Throws if no workspace is mounted.
     */
    workingTree(): Promise<GitWorkingTreeSummary>
    /**
     * Merge `origin/main` into the mounted workspace (clean tree), or reset to
     * `origin/main` when `discardLocal` is true.
     */
    pull(input?: GitPullInput): Promise<GitPullResult>
    /**
     * Delete the local workspace folder and re-clone from the catalog remote URL.
     * Progress events are sent on `gitRecoverWorkspaceProgress`.
     */
    recoverWorkspace(input: GitRecoverWorkspaceInput): Promise<GitRecoverWorkspaceResult>
    onRecoverWorkspaceProgress(handler: (payload: GitRecoverWorkspaceProgress) => void): () => void
    /**
     * Stage all changes under the mounted workspace, commit with the supplied
     * message, and optionally push using the stored GitHub session.
     */
    publish(input: GitPublishInput): Promise<GitPublishResult>
    /**
     * Return a slice of the commit history for the mounted workspace. Includes
     * parent SHAs so the renderer can render a lane graph.
     */
    log(input?: GitLogInput): Promise<GitCommitNode[]>
  }
  catalog: {
    list(): Promise<WorkspaceCatalogEntry[]>
    add(input: Omit<WorkspaceCatalogEntry, 'createdAt' | 'updatedAt'> & { createdAt?: string; updatedAt?: string }): Promise<WorkspaceCatalogEntry>
    remove(input: { id: string; deleteRemote?: boolean }): Promise<void>
  }
  posts: {
    list(input: { section: 'posts' | 'drafts' }): Promise<PostSummary[]>
    read(input: { path: string }): Promise<{ path: string; content: string }>
    save(input: { path: string; content: string }): Promise<{ path: string }>
    /**
     * Move a markdown file between `posts/` and `drafts/`. Used by the publish /
     * send-to-drafts actions so the folder is the single source of truth for
     * publish state.
     */
    move(input: { from: string; to: string }): Promise<{ path: string }>
    /**
     * Delete a markdown file under `posts/` or `drafts/`. The path is validated
     * against the workspace root; deleting outside those folders is refused.
     */
    delete(input: { path: string }): Promise<{ path: string }>
  }
  workspaceSrc: {
    listTree(): Promise<WorkspaceSrcTreeNode | null>
    read(input: { path: string }): Promise<{ path: string; content: string }>
    save(input: { path: string; content: string }): Promise<{ path: string }>
    /** Create a new file or directory under `src/`. Errors if the target path already exists. */
    create(input: { path: string; kind: 'file' | 'directory' }): Promise<{ path: string; kind: 'file' | 'directory' }>
    /** Rename a file or directory under `src/`. The new name must not contain path separators. */
    rename(input: { path: string; newName: string }): Promise<{ path: string }>
    /** Delete a file or directory under `src/`. Refuses to delete the `src/` root itself. */
    delete(input: { path: string }): Promise<void>
    /** Alias for `siteDev.openPreview` (same IPC). */
    openSitePreview(): Promise<SiteDevServerState>
    /** Alias for `siteDev.stop` (same IPC). */
    stopSitePreview(): Promise<SiteDevServerState>
    /** Resolved `tsconfig.json` + Astro typings for Monaco in Design → Code. */
    getMonacoTypescript(): Promise<WorkspaceMonacoTypescriptPayload | null>
  }
  assets: {
    /**
     * Save a (possibly pre-compressed) image into `assets/images/`. The caller is responsible
     * for re-encoding raster images; the main process only enforces the 20MB hard limit and
     * a basic mime-type allowlist.
     */
    saveImage(input: { fileName: string; data: Uint8Array; mimeType: string }): Promise<AssetImageInfo>
    /** List images under `assets/images/` and the posts/drafts that reference each one. */
    listImages(): Promise<AssetImageInfo[]>
    /** Delete a single image under `assets/images/`. */
    deleteImage(input: { path: string }): Promise<void>
  }
  window: {
    minimize(): Promise<void>
    toggleMaximize(): Promise<boolean>
    close(): Promise<void>
    isMaximized(): Promise<boolean>
  }
  siteDev: {
    stop(): Promise<SiteDevServerState>
    status(): Promise<SiteDevServerState>
    openPreview(): Promise<SiteDevServerState>
  }
  app: {
    onGithubSessionCleared(handler: () => void): () => void
  }
}
