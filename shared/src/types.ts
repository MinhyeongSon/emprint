import type { MemoirSectionSummary } from './memoir/sections'

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
/** Astro site scaffold / semantic content format. */
export type SiteProjectKind = 'column' | 'memoir' | 'dictionary' | 'fragments' | 'book'
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
  /**
   * Stable id for local folder + GitHub repo (`{root}/{publicationSlug}/`).
   * Distinct from display `title` and from `siteProjectKind` (format).
   */
  publicationSlug: string
  templateId: WorkspaceTemplateId
  title: string
  description: string
  themeColor: string
  layoutStyle: WorkspaceLayoutStyle
  localDirectory: string
  repository: WorkspaceRepositoryConfig
}

export interface WorkspaceManifest {
  /** Legacy catalog id; equals `publicationSlug` when set. */
  name: string
  /** Stable folder + remote repo slug (see `publicationSlug`). */
  publicationSlug?: string
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

/** Whether an asset is included in the next site publish (git commit). */
export type AssetPublishScope = 'published' | 'draft-only' | 'orphan'

/** Where a post references an asset image. */
export interface AssetReference {
  /** Workspace-relative POSIX path to the referencing post, e.g. `posts/2024-01-01-hello.md`. */
  postPath: string
  postTitle: string
  section: 'posts' | 'drafts' | 'knowledge' | 'story'
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
  /** Derived from post/draft references — only `published` assets ship on publish. */
  publishScope: AssetPublishScope
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

import type { PostSearchMatchField } from './column/post-search'
import type { KnowledgeSearchMatchField } from './dictionary/knowledge-search'

/** Column Posts list search result (desktop IPC). */
export interface PostSearchHit {
  path: string
  title: string
  description: string
  tags: string[]
  updatedAt: string
  snippet: string
  matchedIn: PostSearchMatchField[]
}

/** Dictionary knowledge list search result (desktop IPC). */
export interface KnowledgeSearchHit {
  path: string
  title: string
  description: string
  index: string
  tags: string[]
  updatedAt: string
  snippet: string
  matchedIn: KnowledgeSearchMatchField[]
}

/** Dictionary knowledge entry summary (markdown under knowledge/ or drafts/). */
export interface KnowledgeSummary {
  path: string
  title: string
  description: string
  /** Hierarchical index path, e.g. "Science/Physics". */
  index: string
  tags: string[]
  draft: boolean
  createdAt: string
  updatedAt: string
}

export type { IndexTreeNode } from './dictionary/index-path'
export type { IndexEntrySummary } from './dictionary/index-registry'

/** Dictionary Contents surface — index tree + published knowledge in one payload. */
export interface DictionaryContentsSnapshot {
  indexTree: import('./dictionary/index-path').IndexTreeNode[]
  indexEntries: import('./dictionary/index-registry').IndexEntrySummary[]
  knowledge: KnowledgeSummary[]
}

export interface InitializeWorkspaceResult {
  workspaceRoot: string
  createdFiles: string[]
  manifest: WorkspaceManifest
  starterPost?: PostSummary
  starterPostContent?: string
  starterSection?: MemoirSectionSummary
  starterSectionContent?: string
  starterKnowledge?: KnowledgeSummary
  starterKnowledgeContent?: string
}

export type { MemoirSectionFile, MemoirSectionType } from './memoir/sections'
export type { MemoirSectionSummary } from './memoir/sections'

/**
 * Snapshot of the workspace's git state used by the publish dialog and the
 * Imprint sidebar status pill. `pendingFiles` is the union of every file with
 * any working-tree or staged change.
 */
/** Branch Emprint treats as the single publish line (no in-app branch UI). */
export const EMPRINT_PUBLISH_BRANCH = 'main' as const

export interface GitWorkingTreeSummary {
  branch: string
  /** Expected publish branch (`main`). */
  publishBranch: string
  ahead: number
  behind: number
  hasUpstream: boolean
  hasRemote: boolean
  hasGithubSession: boolean
  /** Merge/unmerged paths present — show conflict recovery UI. */
  hasConflicts: boolean
  /** Checked out branch is not `publishBranch` and could not be auto-corrected. */
  offPublishBranch: boolean
  /**
   * Client-external git use was detected (wrong branch) and Emprint switched back to
   * `publishBranch` automatically.
   */
  branchCorrected: boolean
  previousBranch?: string
  /** Safe fast-forward pull: clean tree on publish branch, behind > 0, not diverged. */
  canPull: boolean
  /**
   * Remote is ahead and local has uncommitted changes and/or unpushed commits.
   * Pull with `discardLocal: true` resets to `origin/main` after user confirmation.
   */
  canPullOverwrite: boolean
  /** Why pull is blocked when `behind > 0` but neither pull mode is available. */
  pullBlockedReason?: GitPullSkipReason
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

export type GitPullSkipReason =
  | 'no-remote'
  | 'no-session'
  | 'no-upstream'
  | 'nothing-to-pull'
  | 'dirty-tree'
  | 'off-branch'
  | 'conflict'
  | 'diverged'

export interface GitPullInput {
  /**
   * When true, fetch and `reset --hard` to `origin/main`, discarding local
   * uncommitted changes and unpushed commits. Requires user confirmation in UI.
   */
  discardLocal?: boolean
}

export interface GitPullResult {
  pulled: boolean
  behind: number
  branch: string
  skippedReason?: GitPullSkipReason
}

export interface GitRecoverWorkspaceInput {
  workspaceId: string
}

export interface GitRecoverWorkspaceResult {
  workspaceId: string
  localDirectory: string
}

export type GitRecoverWorkspacePhase = 'starting' | 'removing' | 'cloning' | 'done' | 'error'

export interface GitRecoverWorkspaceProgress {
  workspaceId: string
  phase: GitRecoverWorkspacePhase
  message: string
  /** 0–100 when applicable */
  progress: number
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

export interface GitRollbackInput {
  /** Full commit SHA of the selected Imprint entry. */
  sha: string
}

export interface GitRollbackResult {
  sha: string
  restored: boolean
  /** Whether the working tree had local changes before restore. */
  hadLocalChanges: boolean
}

export interface GitResetDraftResult {
  restored: boolean
  /** Whether the working tree had local changes before restore. */
  hadLocalChanges: boolean
}

/** Deploy pipeline state after a push (GitHub Actions + Pages). */
export type GitHubDeployPhase =
  | 'no_session'
  | 'no_remote'
  | 'queued'
  | 'in_progress'
  | 'live'
  | 'failed'
  | 'unknown'

export interface GitHubDeployStatus {
  phase: GitHubDeployPhase
  /** Public site URL when known. */
  pagesUrl?: string
  /** Link to the latest Actions workflow run. */
  workflowRunUrl?: string
  workflowName?: string
  /** ISO timestamp of the workflow run we are reporting. */
  updatedAt?: string
  message?: string
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

export interface CatalogReconcileInput {
  workspaceRootDir: string
}

export interface CatalogReconcileResult {
  entries: WorkspaceCatalogEntry[]
  /** Newly registered anthologies found on disk. */
  added: number
  /** Removed catalog rows (missing on disk or outside current root). */
  removed: number
  /** Existing rows refreshed from manifest / git remote. */
  updated: number
}

export type MigrationPlatformId = 'tistory'

export interface TistoryMigrationScanInput {
  backupDir: string
}

export interface TistoryMigrationPostPreview {
  postId: string
  title: string
  date: string
  category?: string
  htmlFileName: string
}

export interface TistoryMigrationScanResult {
  posts: TistoryMigrationPostPreview[]
}

export interface TistoryMigrationRunInput {
  backupDir: string
  /** When true, write under `drafts/` instead of `posts/`. Default true. */
  importAsDraft?: boolean
  /** Skip when the target markdown path already exists. Default true. */
  skipExisting?: boolean
}

export interface TistoryMigrationFailure {
  postId: string
  title: string
  message: string
}

export interface TistoryMigrationRunResult {
  imported: number
  skipped: number
  failed: number
  failures: TistoryMigrationFailure[]
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
  /** True when Emprint auto-enabled Pages (GitHub Actions source) on the new repo. */
  pagesAutoEnabled?: boolean
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

export interface NodeDetectResult {
  available: boolean
  /** e.g. v22.11.0 */
  version?: string
  nodePath?: string
  npmPath?: string
  /** true when major version >= minimumVersion */
  meetsMinimum: boolean
  minimumVersion: string
}

