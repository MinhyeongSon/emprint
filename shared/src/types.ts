export type AppLocale = 'ko' | 'en'

export type SiteDevServerStatus = 'stopped' | 'starting' | 'running' | 'error'

export type SiteDevServerPhase = 'idle' | 'installing' | 'starting-dev' | 'opening-browser'

export interface SiteDevServerState {
  status: SiteDevServerStatus
  url: string
  message?: string
  phase?: SiteDevServerPhase
  /** 0–100 when estimable; omit for indeterminate progress. */
  progress?: number
}
export type WorkspaceType = 'creator' | 'developer' | 'ai'
/** Astro site scaffold: GitHub-oriented blog vs portfolio. */
export type SiteProjectKind = 'column' | 'showcase'
/**
 * A single workspace template (blog). Kept as a named type rather than a
 * literal so workspaces with older manifest values still round-trip through
 * validation (see `shared/src/validation.ts#asWorkspaceTemplateId`).
 */
export type WorkspaceTemplateId = 'blog'
export type WorkspaceLayoutStyle = 'editorial' | 'notebook' | 'magazine'
export type GitRemoteProviderId = 'github' | 'gitlab' | 'gitea' | 'bitbucket' | 'self-hosted'
export type RepositorySetupMode = 'create' | 'clone'

export interface WorkspaceRepositoryConfig {
  mode: RepositorySetupMode
  providerId: GitRemoteProviderId
  remoteUrl?: string
  repositoryName?: string
  defaultBranch?: string
}

export interface WorkspaceConfig {
  authProvider: 'github'
  locale: AppLocale
  workspaceType: WorkspaceType
  /** Astro `src/` + tooling; extensible via site generators in core. */
  siteProjectKind: SiteProjectKind
  templateId: WorkspaceTemplateId
  title: string
  description: string
  themeColor: string
  layoutStyle: WorkspaceLayoutStyle
  localDirectory: string
  repository: WorkspaceRepositoryConfig
}

export interface WorkspaceManifest {
  name: string
  title: string
  description: string
  locale: AppLocale
  workspaceType: WorkspaceType
  /** Present on workspaces created after site generators shipped. */
  siteProjectKind?: SiteProjectKind
  templateId: WorkspaceTemplateId
  themeColor: string
  layoutStyle: WorkspaceLayoutStyle
}

/** Maximum bytes for a single asset image upload. Enforced before compression. */
export const MAX_ASSET_IMAGE_BYTES = 20 * 1024 * 1024

/** Where a post references an asset image. */
export interface AssetReference {
  /** Workspace-relative POSIX path to the referencing post, e.g. `posts/2024-01-01-hello.md`. */
  postPath: string
  postTitle: string
  section: 'posts' | 'drafts'
}

/** A single image file under `assets/images/` plus posts that reference it. */
export interface AssetImageInfo {
  /** Workspace-relative POSIX path, e.g. `assets/images/2024-photo.jpg`. */
  path: string
  name: string
  size: number
  mimeType: string
  modifiedAt: string
  references: AssetReference[]
}

/** One node in the workspace `src/` tree (for Implement surface). */
export interface WorkspaceSrcTreeNode {
  name: string
  /** Path relative to workspace root, POSIX slashes (e.g. `src/pages/index.astro`). */
  path: string
  kind: 'file' | 'directory'
  children?: WorkspaceSrcTreeNode[]
}

export interface PostSummary {
  path: string
  title: string
  description: string
  tags: string[]
  draft: boolean
  createdAt: string
  updatedAt: string
}

export interface InitializeWorkspaceResult {
  workspaceRoot: string
  createdFiles: string[]
  manifest: WorkspaceManifest
  starterPost?: PostSummary
  starterPostContent?: string
}

/**
 * Snapshot of the workspace's git state used by the publish dialog and the
 * Imprint sidebar status pill. `pendingFiles` is the union of every file with
 * any working-tree or staged change.
 */
export interface GitWorkingTreeSummary {
  branch: string
  ahead: number
  behind: number
  hasUpstream: boolean
  hasRemote: boolean
  hasGithubSession: boolean
  pendingFiles: Array<{
    path: string
    /** Single-letter status code summarized for UI: M(odified), A(dded), D(eleted), R(enamed), C(opied), U(nmerged), ?(untracked) */
    status: 'M' | 'A' | 'D' | 'R' | 'C' | 'U' | '?'
    staged: boolean
  }>
}

export interface GitPublishInput {
  message: string
  /** When true, also runs `git push` after committing. Defaults to true. */
  push?: boolean
}

export interface GitPublishResult {
  committed: boolean
  pushed: boolean
  pushedTo?: string
  commitSha?: string
  branch: string
  /** Surfaced when push is skipped (no remote, no auth, nothing to push). */
  pushSkippedReason?: 'no-remote' | 'no-session' | 'nothing-to-push' | 'disabled'
}

/**
 * One node in the commit graph. `parents` order is `[firstParent, mergeParent?]`
 * which the renderer uses to lay out lanes.
 */
export interface GitCommitNode {
  sha: string
  shortSha: string
  parents: string[]
  refs: string[]
  message: string
  /** First line of the message, used as the headline in the list. */
  summary: string
  authorName: string
  authorEmail: string
  authoredAt: string
}

export interface GitLogInput {
  /** Maximum number of commits to return. Defaults to 200. */
  limit?: number
  /** When true, includes all refs (`--all`). Defaults to true. */
  allBranches?: boolean
}

export interface RuntimeDiagnostics {
  appName: string
  appVersion: string
  platform: string
  electron: string
  chrome: string
  node: string
}

export interface DirectorySelectionResult {
  directory: string
}

export interface WorkspaceCatalogEntry {
  id: string
  title: string
  localDirectory: string
  remoteUrl?: string
  createdAt: string
  updatedAt: string
}

export interface MonacoExtraLib {
  /** Virtual path used by Monaco’s TypeScript worker (e.g. `file:///node_modules/astro/client.d.ts`). */
  filePath: string
  content: string
}

export interface WorkspaceMonacoCompilerOptions {
  target?: string
  module?: string
  moduleResolution?: string
  jsx?: string
  lib?: string[]
  baseUrl?: string
  paths?: Record<string, string[]>
  strict?: boolean
  allowJs?: boolean
  esModuleInterop?: boolean
  skipLibCheck?: boolean
  resolveJsonModule?: boolean
  allowImportingTsExtensions?: boolean
  isolatedModules?: boolean
}

export interface WorkspaceMonacoTypescriptPayload {
  workspaceRoot: string
  compilerOptions: WorkspaceMonacoCompilerOptions
  extraLibs: MonacoExtraLib[]
  /** True when `node_modules` is missing — run `npm install` in the anthology for full IntelliSense. */
  nodeModulesMissing?: boolean
}

export interface GitHubDeviceCode {
  deviceCode: string
  userCode: string
  verificationUri: string
  expiresIn: number
  interval: number
}

export interface GitHubAuthStatus {
  connected: boolean
  login?: string
}

export interface GitHubOAuthClientConfig {
  clientId?: string
  /** True when a client secret is stored (or set via env) — required for API token revoke on logout. */
  hasClientSecret?: boolean
}

export type AppCloseGuardKind = 'window' | 'app'

export interface AppCloseGuardRequest {
  kind: AppCloseGuardKind
  login?: string
}

export type AppCloseGuardAction = 'logout' | 'continue' | 'cancel'

export type GitHubRepoVisibility = 'public' | 'private'

export interface GitHubRepoCreateInput {
  owner: string
  name: string
  description?: string
  visibility: GitHubRepoVisibility
}

export interface GitHubRepoCreateResult {
  fullName: string
  htmlUrl: string
  cloneUrl: string
  sshUrl: string
  defaultBranch: string
}

export interface GitInitialSyncResult {
  committed: boolean
  pushed: boolean
  branch: string
}

export type GitBinarySource = 'system' | 'tool' | 'missing'

export interface GitDetectResult {
  available: boolean
  version?: string
  path?: string
  source: GitBinarySource
}

