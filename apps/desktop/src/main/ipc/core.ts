import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { homedir } from 'node:os'
import { mkdir, readFile, rm, stat, unlink, writeFile, readdir } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { BrowserWindow, app, dialog, type WebContents } from 'electron'
import { getAuthProvider, performGithubLogout, readGithubSession, type StoredAuthSession } from '../auth'
import {
  isQaMockGitPushEnabled,
  mockGitInitialSyncResult,
  mockGitPushResult
} from '../qa/hooks'
import {
  MAX_ASSET_IMAGE_BYTES,
  hasPathTraversalSegment,
  type AssetImageInfo,
  type AssetPublishScope,
  type AssetReference,
  type GitHubRepoCreateInput,
  type GitHubRepoCreateResult,
  type GitCommitNode,
  type GitDetectResult,
  type GitInitialSyncResult,
  type GitLogInput,
  type GitRollbackInput,
  type GitRollbackResult,
  type GitResetDraftResult,
  EMPRINT_GITIGNORE_LINES,
  EMPRINT_PUBLISH_BRANCH,
  classifyAssetPublishScope,
  isEmprintIgnoredPublishPath,
  isNonPublishableAssetPendingPath,
  isNonPublishableAssetScope,
  normalizePublishPendingPath,
  type GitPublishInput,
  type GitPublishResult,
  type GitPullInput,
  type GitPullResult,
  type GitPullSkipReason,
  ipcChannels,
  type GitRecoverWorkspaceInput,
  type GitRecoverWorkspaceProgress,
  type GitRecoverWorkspaceResult,
  type GitWorkingTreeSummary,
  type KnowledgeSummary,
  type PostSummary,
  type SiteProjectKind,
  buildIndexTree,
  normalizeIndexPath,
  MANIFEST_RELATIVE_PATH,
  parseWorkspaceManifestJson,
  WORKSPACE_DIR
} from '@emprint/shared'
import { parseKnowledgeSummary, parsePostSummary, workspaceRuntime } from '@emprint/core'
import { readCatalog, writeCatalog } from '../catalog/catalog-store'
import { setGitBinaryPath, SimpleGitProvider } from '../infrastructure/simple-git-provider'
import simpleGit from 'simple-git'
import { stopSiteDevServer } from '../site-dev/server'
import { getMountedWorkspaceRoot, setMountedWorkspaceRoot } from './state'

let resolvedGitBinaryPath: string | null = null
export async function gitDetect(): Promise<GitDetectResult> {
  // 1) If we already resolved a git binary, reuse it.
  if (resolvedGitBinaryPath) {
    const version = await tryGetGitVersion(resolvedGitBinaryPath)
    if (version) {
      return { available: true, version, path: resolvedGitBinaryPath, source: resolvedGitBinaryPath === 'git' ? 'system' : 'tool' }
    }
    resolvedGitBinaryPath = null
  }

  // 2) System git.
  const systemVersion = await tryGetGitVersion('git')
  if (systemVersion) {
    resolvedGitBinaryPath = 'git'
    setGitBinaryPath(undefined)
    return { available: true, version: systemVersion, path: 'git', source: 'system' }
  }

  return { available: false, source: 'missing' }
}

export async function tryGetGitVersion(binary: string): Promise<string | null> {
  try {
    const res = await runProcess(binary, ['--version'])
    const match = res.trim().match(/git version\s+(.+)$/i)
    return match?.[1]?.trim() || res.trim() || 'unknown'
  } catch {
    return null
  }
}

export async function runProcess(command: string, args: string[]): Promise<string> {
  return await new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let out = ''
    let err = ''
    child.stdout.on('data', (d) => (out += String(d)))
    child.stderr.on('data', (d) => (err += String(d)))
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) return resolve(out || err)
      reject(new Error(err || out || `Command failed: ${command}`))
    })
  })
}


let appCloseGuardRegistered = false
let skipAppCloseGuard = false
let closeGuardInProgress = false
let closeGuardMainWindow: BrowserWindow | null = null

export function notifyRendererGithubSessionCleared(win: BrowserWindow | null): void {
  if (!win || win.isDestroyed()) return
  win.webContents.send(ipcChannels.githubSessionCleared)
}

/** Native dialog so quit/close works in dev (renderer may tear down before React can paint). */
export async function runCloseGuardDialog(kind: 'window' | 'app', login?: string): Promise<'logout' | 'continue' | 'cancel'> {
  const win = closeGuardMainWindow
  const parent = win && !win.isDestroyed() ? win : BrowserWindow.getFocusedWindow() ?? undefined

  const isKo = app.getLocale().toLowerCase().startsWith('ko')
  const title =
    kind === 'app'
      ? isKo
        ? 'Emprint 종료'
        : 'Quit Emprint'
      : isKo
        ? '창 닫기'
        : 'Close window'

  const message =
    kind === 'app'
      ? isKo
        ? 'Emprint를 종료할까요?'
        : 'Quit Emprint?'
      : isKo
        ? '창을 닫을까요?'
        : 'Close this window?'

  const detail = login
    ? isKo
      ? `GitHub(${login})에 로그인된 상태입니다. 공용 PC라면 로그아웃하는 것이 좋습니다.`
      : `You are signed in to GitHub as ${login}. On a shared computer, log out before leaving.`
    : isKo
      ? 'GitHub에 로그인된 상태입니다. 공용 PC라면 로그아웃하는 것이 좋습니다.'
      : 'You are signed in to GitHub. On a shared computer, log out before leaving.'

  const buttons = isKo
    ? ['로그아웃', kind === 'app' ? '로그아웃 없이 종료' : '로그아웃 없이 닫기', '취소']
    : ['Log out', kind === 'app' ? 'Quit without logging out' : 'Close without logging out', 'Cancel']

  const options = {
    type: 'warning' as const,
    title,
    message,
    detail,
    buttons,
    defaultId: 0,
    cancelId: 2,
    noLink: true
  }
  const { response } = parent
    ? await dialog.showMessageBox(parent, options)
    : await dialog.showMessageBox(options)

  if (response === 0) return 'logout'
  if (response === 1) return 'continue'
  return 'cancel'
}

export async function handleCloseAttempt(kind: 'window' | 'app'): Promise<void> {
  if (skipAppCloseGuard) {
    if (kind === 'app') app.exit(0)
    else closeGuardMainWindow?.close()
    return
  }

  if (closeGuardInProgress) return
  closeGuardInProgress = true

  try {
    const status = await getAuthProvider('github').authStatus()
    if (!status.connected) {
      skipAppCloseGuard = true
      if (kind === 'app') app.exit(0)
      else closeGuardMainWindow?.close()
      return
    }

    const action = await runCloseGuardDialog(kind, status.login)
    if (action === 'cancel') return

    if (action === 'logout') {
      await performGithubLogout()
      notifyRendererGithubSessionCleared(closeGuardMainWindow)
    }

    skipAppCloseGuard = true
    if (kind === 'app') {
      app.exit(0)
    } else {
      closeGuardMainWindow?.close()
    }
  } finally {
    closeGuardInProgress = false
  }
}

/** Prompt to log out on shared PCs when closing the window or quitting the app. */
export function registerAppCloseGuard(mainWindow: BrowserWindow): void {
  closeGuardMainWindow = mainWindow

  mainWindow.on('close', (event) => {
    if (skipAppCloseGuard) return
    event.preventDefault()
    void handleCloseAttempt('window')
  })

  if (appCloseGuardRegistered) return
  appCloseGuardRegistered = true

  app.on('before-quit', (event) => {
    if (skipAppCloseGuard) return
    if (closeGuardInProgress) {
      event.preventDefault()
      return
    }
    event.preventDefault()
    void handleCloseAttempt('app')
  })
}

export async function githubRepoCreate(input: GitHubRepoCreateInput): Promise<GitHubRepoCreateResult> {
  const session = await readGithubSession()
  if (!session) {
    throw new Error('GitHub is not connected yet.')
  }

  if (input.visibility !== 'public') {
    throw new Error('Only public repositories are supported in this build.')
  }

  const owner = input.owner.trim()
  const name = input.name.trim()
  if (!owner || !name) {
    throw new Error('Invalid repository input.')
  }

  const isUserRepo = owner === session.login
  const endpoint = isUserRepo ? 'https://api.github.com/user/repos' : `https://api.github.com/orgs/${encodeURIComponent(owner)}/repos`

  const description = input.description?.trim() ? input.description.trim() : undefined

  const created = await githubRepoCreateWithFallback({
    endpoint,
    token: session.accessToken,
    name,
    ...(description ? { description } : {})
  })

  const fullName = typeof created.full_name === 'string' ? created.full_name : `${owner}/${name}`
  const htmlUrl = typeof created.html_url === 'string' ? created.html_url : `https://github.com/${fullName}`
  const cloneUrl = typeof created.clone_url === 'string' ? created.clone_url : `https://github.com/${fullName}.git`
  const sshUrl = typeof created.ssh_url === 'string' ? created.ssh_url : ''
  const defaultBranch = typeof created.default_branch === 'string' ? created.default_branch : 'main'

  // Best-effort: configure the new repo to deploy Pages from GitHub Actions
  // so the user doesn't have to flip "Build and deployment → Source" in the
  // repo settings UI. Failures here are non-fatal — the workspace itself is
  // already created and the user can still enable Pages manually.
  await tryEnableGitHubPagesViaActions(owner, name, session.accessToken)

  return { fullName, htmlUrl, cloneUrl, sshUrl, defaultBranch }
}

/**
 * Enable GitHub Pages on a freshly-created repo with the "GitHub Actions"
 * build source. This is what makes `actions/deploy-pages@v4` in the generated
 * workflow actually publish — without it, the first deploy step fails with
 * "Pages site not configured".
 *
 * Quirks observed in the wild:
 *   - 201 Created → Pages site newly created (happy path)
 *   - 409 Conflict / 422 with "already exists" → already enabled (treat as success)
 *   - 404 → repo not yet visible to the API; rare race after repo creation
 *   - 403 → token lacks pages scope on this owner (org settings, SSO, etc.)
 *
 * We only log non-success outcomes; the workspace creation must not fail
 * just because Pages couldn't be auto-configured.
 */
function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function githubRepoExistsOnApi(owner: string, repo: string, token: string): Promise<boolean> {
  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'Emprint'
      }
    })
    return res.status === 200
  } catch {
    return false
  }
}

export async function tryEnableGitHubPagesViaActions(owner: string, repo: string, token: string): Promise<void> {
  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pages`
  const retryDelaysMs = [0, 600, 1200, 2400, 4800]

  for (let attempt = 0; attempt < retryDelaysMs.length; attempt++) {
    const delay = retryDelaysMs[attempt] ?? 4800
    if (delay > 0) await sleepMs(delay)

    if (attempt > 0) {
      const ready = await githubRepoExistsOnApi(owner, repo, token)
      if (!ready) continue
    }

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${token}`,
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'Emprint',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ build_type: 'workflow' })
      })

      if (res.status === 201 || res.status === 204 || res.status === 409) return

      const text = await safeReadText(res)
      if (res.status === 422 && /already|exists|configured/i.test(text)) return

      if (res.status === 404 && attempt < retryDelaysMs.length - 1) continue

      console.warn(
        `[emprint] Could not auto-enable GitHub Pages for ${owner}/${repo} (${res.status}): ${text}`
      )
      return
    } catch (err) {
      if (attempt < retryDelaysMs.length - 1) continue
      console.warn(`[emprint] Could not auto-enable GitHub Pages for ${owner}/${repo}:`, err)
    }
  }
}

export async function githubRepoDeleteRemote(owner: string, repo: string): Promise<void> {
  const session = await readGithubSession()
  if (!session) {
    throw new Error('GitHub is not connected. Sign in to delete the remote repository.')
  }

  const o = owner.trim()
  const r = repo.trim()
  if (!o || !r) {
    throw new Error('Invalid GitHub repository path.')
  }

  const url = `https://api.github.com/repos/${encodeURIComponent(o)}/${encodeURIComponent(r)}`
  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${session.accessToken}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'Emprint'
    }
  })

  if (res.status === 204 || res.status === 404) {
    return
  }

  const text = await safeReadText(res)
  if (res.status === 403) {
    throw new Error(
      'GitHub denied deleting this repository. Approve the delete_repo scope: sign out, sign in again, and accept all requested permissions.'
    )
  }

  throw githubApiErrorFromResponse(res.status, text)
}

export async function githubRepoCreateWithFallback(input: {
  endpoint: string
  token: string
  name: string
  description?: string
}): Promise<any> {
  const payloadBase = { name: input.name, private: false }
  const payloadWithDescription = input.description ? { ...payloadBase, description: input.description } : payloadBase

  const first = await githubApiPostRaw(input.endpoint, input.token, payloadWithDescription)
  if (first.ok) return first.json

  // If GitHub rejects the description field, retry without it (it is optional).
  if (first.status === 400 && input.description) {
    const retry = await githubApiPostRaw(input.endpoint, input.token, payloadBase)
    if (retry.ok) return retry.json
    throw githubApiErrorFromResponse(retry.status, retry.text)
  }

  throw githubApiErrorFromResponse(first.status, first.text)
}

export async function githubApiPostRaw(url: string, token: string, body: unknown): Promise<{ ok: boolean; status: number; text: string; json: any }> {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'Emprint',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })

  const text = await safeReadText(res)
  const json = safeJsonParse(text)
  return { ok: res.ok, status: res.status, text, json }
}

export function githubApiErrorFromResponse(status: number, text: string): Error {
  const maybeJson = safeJsonParse(text)

  if (status === 422 && maybeJson && typeof maybeJson === 'object') {
    const message = typeof (maybeJson as any).message === 'string' ? String((maybeJson as any).message) : ''
    const errors = Array.isArray((maybeJson as any).errors) ? ((maybeJson as any).errors as any[]) : []
    const nameConflict = errors.some((err) => err?.field === 'name' && String(err?.message || '').includes('already exists'))
    if (nameConflict) {
      return new Error('Repository name already exists for this owner. Please choose a different name.')
    }
    return new Error(message ? `GitHub API failed (${status}): ${message}` : `GitHub API failed (${status}): ${text}`)
  }

  return new Error(`GitHub API failed (${status}): ${text}`)
}

export function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

export async function safeReadText(res: Response): Promise<string> {
  try {
    return await res.text()
  } catch {
    return ''
  }
}

/** Match GitHub / network blips that often succeed on retry (initial push only). */
const TRANSIENT_GIT_REMOTE_ERR = /HTTP\s+50[02348]|RPC failed|unexpected disconnect|hung up unexpectedly|timed out|ECONNRESET|ETIMEDOUT/i

export async function runGitRawWithRetry(git: ReturnType<typeof simpleGit>, args: string[], attempts = 3): Promise<void> {
  const baseDelayMs = 1200
  for (let i = 1; i <= attempts; i++) {
    try {
      await git.raw(args)
      return
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (!TRANSIENT_GIT_REMOTE_ERR.test(msg) || i === attempts) throw e
      await new Promise((r) => setTimeout(r, baseDelayMs * i))
    }
  }
}

/**
 * Make sure the repo at `directory` has a `user.name` + `user.email`
 * configured. Without this, commits fail on machines that have never run
 * `git config --global user.email …` — a common case for non-developers
 * who installed Emprint as their first git tool.
 *
 * We only ever set values at **local scope** so existing global git
 * identities (work vs personal, etc.) are never overridden. The
 * `noreply` email pattern is GitHub's published convention for
 * privacy-preserving commits that still attribute to the correct user.
 */
export async function ensureGitAuthorIdentity(
  git: ReturnType<typeof simpleGit>,
  session: StoredAuthSession | null
): Promise<void> {
  let hasName = false
  let hasEmail = false
  try {
    const name = (await git.raw(['config', '--get', 'user.name'])).trim()
    hasName = name.length > 0
  } catch {
    hasName = false
  }
  try {
    const email = (await git.raw(['config', '--get', 'user.email'])).trim()
    hasEmail = email.length > 0
  } catch {
    hasEmail = false
  }
  if (hasName && hasEmail) return

  const fallbackName = session?.login?.trim() || 'Emprint'
  const fallbackEmail = session?.login
    ? `${session.login}@users.noreply.github.com`
    : 'emprint@users.noreply.github.com'

  if (!hasName) {
    await git.raw(['config', '--local', 'user.name', fallbackName])
  }
  if (!hasEmail) {
    await git.raw(['config', '--local', 'user.email', fallbackEmail])
  }
}

export async function gitInitialSync(input: { directory: string; remoteUrl?: string; branch?: string }): Promise<GitInitialSyncResult> {
  const directory = path.resolve(input.directory)
  const branch = input.branch?.trim() || 'main'
  const remoteUrl = input.remoteUrl?.trim()

  const git = simpleGit(directory)

  // Guarantee an author identity before the first commit so non-developer
  // machines (no global git config) don't fail silently. Uses the stored
  // GitHub session when available so commits attribute correctly.
  const session = await readGithubSession()
  await ensureGitAuthorIdentity(git, session)
  await ensureEmprintGitignore(directory)
  await untrackEmprintIgnoredPaths(directory)

  // Stage + commit if possible (ignore if nothing to commit).
  let committed = false
  try {
    await gitStagePublishableChanges(git, directory)
    await git.commit("Show where you've been.")
    committed = true
  } catch {
    committed = false
  }

  try {
    await git.raw(['branch', '-M', branch])
  } catch {
    // ignore
  }

  if (!remoteUrl || !session) {
    return { committed, pushed: false, branch }
  }

  if (isQaMockGitPushEnabled()) {
    return mockGitInitialSyncResult(branch)
  }

  const authUrl = buildGithubAuthRemoteUrl(remoteUrl, session.accessToken)
  await runGitRawWithRetry(git, ['push', '-u', authUrl, branch])
  return { committed, pushed: true, branch }
}

export function countPendingFiles(status: Awaited<ReturnType<ReturnType<typeof simpleGit>['status']>>): number {
  return (
    status.staged.length +
    status.created.length +
    status.modified.length +
    status.deleted.length +
    status.renamed.length +
    status.not_added.length +
    status.conflicted.length
  )
}

export function mapPendingFiles(
  status: Awaited<ReturnType<ReturnType<typeof simpleGit>['status']>>,
  nonPublishableAssetPaths?: Set<string>
): GitWorkingTreeSummary['pendingFiles'] {
  const seen = new Set<string>()
  const pending: GitWorkingTreeSummary['pendingFiles'] = []
  const push = (filePath: string, statusCode: GitWorkingTreeSummary['pendingFiles'][number]['status'], staged: boolean) => {
    const key = `${filePath}::${staged ? 's' : 'w'}`
    if (seen.has(key)) return
    seen.add(key)
    pending.push({ path: filePath, status: statusCode, staged })
  }
  for (const f of status.staged) push(f, 'M', true)
  for (const f of status.created) push(f, 'A', true)
  for (const f of status.deleted) push(f, 'D', false)
  for (const f of status.modified) push(f, 'M', false)
  for (const f of status.renamed) push(typeof f === 'string' ? f : f.to, 'R', false)
  for (const f of status.not_added) push(f, '?', false)
  for (const f of status.conflicted) push(f, 'U', false)
  return pending.filter((f) => {
    const normalized = normalizePublishPendingPath(f.path)
    if (isEmprintIgnoredPublishPath(normalized)) return false
    if (isNonPublishableAssetPendingPath(f.path, nonPublishableAssetPaths)) return false
    return true
  })
}

/** Incremental index: which posts reference which images (for publish-scope). */
type IncrementalPublishScopeIndex = {
  postsFp: string
  draftsFp: string
  assetsFp: string
  imageByKey: Map<string, string>
  imagePaths: Set<string>
  refsByImage: Map<string, AssetReference[]>
  /** post path → last scanned mtime */
  postMtimes: Map<string, number>
}

type WorkspacePublishScopeCache = {
  fingerprint: string
  index: IncrementalPublishScopeIndex
  nonPublishable: Set<string>
  appliedNonPublishableKey: string | null
  excludeWrittenKey: string | null
}

const publishScopeCacheByWorkspace = new Map<string, WorkspacePublishScopeCache>()
const emprintGitignoreEnsuredRoots = new Set<string>()

function publishScopeCacheKey(workspaceRoot: string): string {
  return path.resolve(workspaceRoot)
}

function nonPublishableSetKey(paths: Set<string>): string {
  return [...paths].sort().join('\n')
}

function publishedMarkdownSection(kind: SiteProjectKind): 'posts' | 'knowledge' {
  return kind === 'dictionary' ? 'knowledge' : 'posts'
}

function contentSectionFromPath(
  relPath: string
): AssetReference['section'] | null {
  if (relPath.startsWith(`${WORKSPACE_DIR.posts}/`)) return 'posts'
  if (relPath.startsWith(`${WORKSPACE_DIR.knowledge}/`)) return 'knowledge'
  if (relPath.startsWith(`${WORKSPACE_DIR.drafts}/`)) return 'drafts'
  return null
}

function postSectionFromPath(postPath: string): 'posts' | 'drafts' | 'knowledge' | null {
  return contentSectionFromPath(postPath)
}

function resolveWorkspaceSiteProjectKind(workspaceRoot: string): SiteProjectKind {
  if (workspaceRuntime.mountedRoot && path.resolve(workspaceRuntime.mountedRoot) === path.resolve(workspaceRoot)) {
    return workspaceRuntime.siteProjectKind
  }
  const manifestPath = path.join(workspaceRoot, MANIFEST_RELATIVE_PATH)
  try {
    const raw = readFileSync(manifestPath, 'utf8')
    const manifest = parseWorkspaceManifestJson(raw)
    if (manifest?.siteProjectKind) return manifest.siteProjectKind
  } catch {
    // fall through
  }
  return 'column'
}

/** Drop cached publish-scope index (e.g. migration). */
export function invalidateWorkspacePublishScopeCache(workspaceRoot: string): void {
  publishScopeCacheByWorkspace.delete(publishScopeCacheKey(workspaceRoot))
}

/** @deprecated Prefer `applyPostPublishScopeChange` with a post path. */
export function markWorkspacePublishScopeDirty(
  workspaceRoot: string,
  hint?: { postPath?: string; assetsCatalog?: boolean }
): void {
  if (!hint?.postPath && !hint?.assetsCatalog) {
    invalidateWorkspacePublishScopeCache(workspaceRoot)
    return
  }
  const key = publishScopeCacheKey(workspaceRoot)
  const cached = publishScopeCacheByWorkspace.get(key)
  if (!cached?.index) return
  if (hint.postPath) {
    removePostFromPublishScopeIndex(cached.index, hint.postPath)
    cached.fingerprint = ''
  }
  if (hint.assetsCatalog) {
    cached.index.assetsFp = ''
    cached.fingerprint = ''
  }
}

async function flatDirFingerprint(dir: string): Promise<string> {
  if (!existsSync(dir)) return '0:0'
  const entries = await readdir(dir, { withFileTypes: true })
  let count = 0
  let maxMtime = 0
  for (const ent of entries) {
    if (!ent.isFile()) continue
    count++
    const st = await stat(path.join(dir, ent.name))
    maxMtime = Math.max(maxMtime, st.mtimeMs)
  }
  return `${count}:${maxMtime}`
}

async function publishScopeFingerprint(workspaceRoot: string): Promise<string> {
  const kind = resolveWorkspaceSiteProjectKind(workspaceRoot)
  const published = publishedMarkdownSection(kind)
  return [
    await flatDirFingerprint(path.join(workspaceRoot, published)),
    await flatDirFingerprint(path.join(workspaceRoot, WORKSPACE_DIR.drafts)),
    await flatDirFingerprint(path.join(workspaceRoot, WORKSPACE_DIR.assetsImages))
  ].join('|')
}

function removePostFromPublishScopeIndex(index: IncrementalPublishScopeIndex, postPath: string): void {
  index.postMtimes.delete(postPath)
  for (const [imagePath, refs] of index.refsByImage) {
    const next = refs.filter((r) => r.postPath !== postPath)
    if (next.length !== refs.length) {
      index.refsByImage.set(imagePath, next)
    }
  }
}

function registerImagePath(index: IncrementalPublishScopeIndex, imagePath: string): void {
  const rel = normalizePublishPendingPath(imagePath)
  index.imagePaths.add(rel)
  index.imageByKey.set(rel, rel)
  index.imageByKey.set(path.basename(rel), rel)
  if (!index.refsByImage.has(rel)) {
    index.refsByImage.set(rel, [])
  }
}

function unregisterImagePath(index: IncrementalPublishScopeIndex, imagePath: string): void {
  const rel = normalizePublishPendingPath(imagePath)
  index.imagePaths.delete(rel)
  index.refsByImage.delete(rel)
  for (const [key, target] of [...index.imageByKey.entries()]) {
    if (target === rel) index.imageByKey.delete(key)
  }
}

function collectRefsFromMarkdown(
  postRelPath: string,
  content: string,
  section: AssetReference['section'],
  imageByKey: Map<string, string>,
  titleFallback: string
): Array<{ imagePath: string; reference: AssetReference }> {
  const summary = { title: titleFallback }
  const hits: Array<{ imagePath: string; reference: AssetReference }> = []
  for (const ref of extractMarkdownImageRefs(content)) {
    const target = normalizeReferenceTarget(ref)
    if (!target) continue
    const imagePath = imageByKey.get(target) ?? imageByKey.get(target.split('/').pop()!)
    if (!imagePath) continue
    hits.push({
      imagePath,
      reference: { postPath: postRelPath, postTitle: summary.title, section }
    })
  }
  return hits
}

function applyPostRefsToIndex(
  index: IncrementalPublishScopeIndex,
  hits: Array<{ imagePath: string; reference: AssetReference }>
): void {
  for (const { imagePath, reference } of hits) {
    const refs = index.refsByImage.get(imagePath)
    if (!refs) continue
    if (refs.some((r) => r.postPath === reference.postPath)) continue
    refs.push(reference)
  }
}

async function syncAssetCatalogInIndex(
  workspaceRoot: string,
  index: IncrementalPublishScopeIndex
): Promise<void> {
  const imagesDir = path.join(workspaceRoot, WORKSPACE_DIR.assetsImages)
  const onDisk = new Set<string>()
  if (existsSync(imagesDir)) {
    const dirents = await readdir(imagesDir, { withFileTypes: true })
    for (const ent of dirents) {
      if (!ent.isFile()) continue
      const ext = ent.name.split('.').pop()?.toLowerCase() ?? ''
      if (!Object.values(ASSET_IMAGE_MIME_ALLOWLIST).includes(ext)) continue
      onDisk.add(normalizePublishPendingPath(`${WORKSPACE_DIR.assetsImages}/${ent.name}`))
    }
  }

  for (const rel of onDisk) {
    if (!index.imagePaths.has(rel)) registerImagePath(index, rel)
  }
  for (const rel of [...index.imagePaths]) {
    if (!onDisk.has(rel)) unregisterImagePath(index, rel)
  }

  index.assetsFp = await flatDirFingerprint(imagesDir)
}

async function refreshPostInPublishScopeIndex(
  workspaceRoot: string,
  index: IncrementalPublishScopeIndex,
  postPath: string,
  content?: string
): Promise<void> {
  const section = postSectionFromPath(postPath)
  if (!section) return

  removePostFromPublishScopeIndex(index, postPath)

  const abs = path.join(workspaceRoot, postPath)
  let mtimeMs = 0
  let body = content
  try {
    const st = await stat(abs)
    if (!st.isFile()) return
    mtimeMs = st.mtimeMs
    if (body === undefined) {
      body = await readFile(abs, 'utf8')
    }
  } catch {
    return
  }

  index.postMtimes.set(postPath, mtimeMs)
  const title =
    section === 'knowledge'
      ? parseKnowledgeSummary(postPath, body).title
      : summarizeMarkdown(postPath, body, '').title
  const hits = collectRefsFromMarkdown(postPath, body, section, index.imageByKey, title)
  applyPostRefsToIndex(index, hits)
}

async function incrementalUpdatePostSection(
  workspaceRoot: string,
  index: IncrementalPublishScopeIndex,
  section: 'posts' | 'drafts' | 'knowledge'
): Promise<void> {
  const dir = path.join(workspaceRoot, section)
  const present = new Set<string>()

  if (existsSync(dir)) {
    const files = await safeListDirectory(dir)
    for (const fileName of files) {
      if (!fileName.toLowerCase().endsWith('.md')) continue
      const postRelPath = `${section}/${fileName}`
      present.add(postRelPath)

      const abs = path.join(dir, fileName)
      let mtimeMs = 0
      try {
        mtimeMs = (await stat(abs)).mtimeMs
      } catch {
        continue
      }

      if (index.postMtimes.get(postRelPath) === mtimeMs) continue
      await refreshPostInPublishScopeIndex(workspaceRoot, index, postRelPath)
    }
  }

  for (const tracked of [...index.postMtimes.keys()]) {
    if (tracked.startsWith(`${section}/`) && !present.has(tracked)) {
      removePostFromPublishScopeIndex(index, tracked)
    }
  }

  const fp = await flatDirFingerprint(dir)
  if (section === 'drafts') index.draftsFp = fp
  else index.postsFp = fp
}

async function buildFullPublishScopeIndex(workspaceRoot: string): Promise<IncrementalPublishScopeIndex> {
  const kind = resolveWorkspaceSiteProjectKind(workspaceRoot)
  const published = publishedMarkdownSection(kind)
  const index: IncrementalPublishScopeIndex = {
    postsFp: '',
    draftsFp: '',
    assetsFp: '',
    imageByKey: new Map(),
    imagePaths: new Set(),
    refsByImage: new Map(),
    postMtimes: new Map()
  }

  await syncAssetCatalogInIndex(workspaceRoot, index)
  await incrementalUpdatePostSection(workspaceRoot, index, published)
  await incrementalUpdatePostSection(workspaceRoot, index, 'drafts')
  return index
}

async function incrementalUpdatePublishScopeIndex(
  workspaceRoot: string,
  index: IncrementalPublishScopeIndex
): Promise<IncrementalPublishScopeIndex> {
  const [postsFp, draftsFp, assetsFp] = await Promise.all([
    flatDirFingerprint(path.join(workspaceRoot, WORKSPACE_DIR.posts)),
    flatDirFingerprint(path.join(workspaceRoot, WORKSPACE_DIR.drafts)),
    flatDirFingerprint(path.join(workspaceRoot, WORKSPACE_DIR.assetsImages))
  ])

  if (assetsFp !== index.assetsFp) {
    await syncAssetCatalogInIndex(workspaceRoot, index)
  }
  const published = publishedMarkdownSection(resolveWorkspaceSiteProjectKind(workspaceRoot))
  if (postsFp !== index.postsFp) {
    await incrementalUpdatePostSection(workspaceRoot, index, published)
  }
  if (draftsFp !== index.draftsFp) {
    await incrementalUpdatePostSection(workspaceRoot, index, 'drafts')
  }

  return index
}

function nonPublishablePathsFromIndex(index: IncrementalPublishScopeIndex): Set<string> {
  const paths = new Set<string>()
  for (const imagePath of index.imagePaths) {
    const refs = index.refsByImage.get(imagePath) ?? []
    if (isNonPublishableAssetScope(classifyAssetPublishScope(refs))) {
      paths.add(imagePath)
    }
  }
  return paths
}

function writePublishScopeCacheEntry(
  workspaceRoot: string,
  index: IncrementalPublishScopeIndex,
  fingerprint: string,
  nonPublishable: Set<string>
): void {
  const key = publishScopeCacheKey(workspaceRoot)
  const prev = publishScopeCacheByWorkspace.get(key)
  publishScopeCacheByWorkspace.set(key, {
    fingerprint,
    index,
    nonPublishable,
    appliedNonPublishableKey: prev?.appliedNonPublishableKey ?? null,
    excludeWrittenKey: prev?.excludeWrittenKey ?? null
  })
}

async function ensurePublishScopeIndex(workspaceRoot: string): Promise<IncrementalPublishScopeIndex> {
  const key = publishScopeCacheKey(workspaceRoot)
  const cached = publishScopeCacheByWorkspace.get(key)
  if (cached?.index) {
    return await incrementalUpdatePublishScopeIndex(workspaceRoot, cached.index)
  }
  return await buildFullPublishScopeIndex(workspaceRoot)
}

/** Scan all image publish scopes (full rebuild). */
export async function collectNonPublishableAssetPaths(workspaceRoot: string): Promise<Set<string>> {
  const index = await buildFullPublishScopeIndex(workspaceRoot)
  return nonPublishablePathsFromIndex(index)
}

async function resolveNonPublishableAssetPathsCached(workspaceRoot: string): Promise<Set<string>> {
  const key = publishScopeCacheKey(workspaceRoot)
  const fingerprint = await publishScopeFingerprint(workspaceRoot)
  const cached = publishScopeCacheByWorkspace.get(key)
  if (cached?.fingerprint === fingerprint) {
    return cached.nonPublishable
  }

  const index = cached?.index
    ? await incrementalUpdatePublishScopeIndex(workspaceRoot, cached.index)
    : await buildFullPublishScopeIndex(workspaceRoot)
  const nonPublishable = nonPublishablePathsFromIndex(index)
  writePublishScopeCacheEntry(workspaceRoot, index, fingerprint, nonPublishable)
  return nonPublishable
}

/** Update one post in the incremental index (after save). */
export async function applyPostPublishScopeChange(
  workspaceRoot: string,
  postPath: string,
  content?: string
): Promise<void> {
  const key = publishScopeCacheKey(workspaceRoot)
  const index =
    publishScopeCacheByWorkspace.get(key)?.index ?? (await buildFullPublishScopeIndex(workspaceRoot))
  await refreshPostInPublishScopeIndex(workspaceRoot, index, postPath, content)
  const fingerprint = await publishScopeFingerprint(workspaceRoot)
  writePublishScopeCacheEntry(workspaceRoot, index, fingerprint, nonPublishablePathsFromIndex(index))
}

/** Update index after posts/drafts move. */
export async function applyPostsMovePublishScope(
  workspaceRoot: string,
  fromPath: string,
  toPath: string
): Promise<void> {
  const index = await ensurePublishScopeIndex(workspaceRoot)
  removePostFromPublishScopeIndex(index, fromPath)
  await refreshPostInPublishScopeIndex(workspaceRoot, index, toPath)
  const fingerprint = await publishScopeFingerprint(workspaceRoot)
  writePublishScopeCacheEntry(workspaceRoot, index, fingerprint, nonPublishablePathsFromIndex(index))
}

/** Update index after post delete. */
export async function applyPostDeletePublishScope(workspaceRoot: string, postPath: string): Promise<void> {
  const key = publishScopeCacheKey(workspaceRoot)
  const cached = publishScopeCacheByWorkspace.get(key)
  if (!cached?.index) return
  removePostFromPublishScopeIndex(cached.index, postPath)
  const fingerprint = await publishScopeFingerprint(workspaceRoot)
  writePublishScopeCacheEntry(
    workspaceRoot,
    cached.index,
    fingerprint,
    nonPublishablePathsFromIndex(cached.index)
  )
}

/** Update index after asset file add/remove. */
export async function applyAssetCatalogPublishScope(workspaceRoot: string): Promise<void> {
  const index = await ensurePublishScopeIndex(workspaceRoot)
  await syncAssetCatalogInIndex(workspaceRoot, index)
  const fingerprint = await publishScopeFingerprint(workspaceRoot)
  writePublishScopeCacheEntry(workspaceRoot, index, fingerprint, nonPublishablePathsFromIndex(index))
}

async function untrackNonPublishableAssets(
  git: ReturnType<typeof simpleGit>,
  paths: Set<string>
): Promise<void> {
  const rels = [...paths]
  if (rels.length === 0) return
  try {
    await git.raw(['rm', '--cached', '--ignore-unmatch', ...rels])
  } catch {
    // not tracked
  }
}

async function unstageNonPublishableAssets(
  git: ReturnType<typeof simpleGit>,
  paths: Set<string>
): Promise<void> {
  const rels = [...paths]
  if (rels.length === 0) return
  try {
    await git.raw(['reset', 'HEAD', '--', ...rels])
  } catch {
    // path was not staged
  }
}

const GIT_EXCLUDE_NON_PUBLISHABLE_BEGIN = '# >>> emprint-non-publishable-assets'
const GIT_EXCLUDE_NON_PUBLISHABLE_END = '# <<< emprint-non-publishable-assets'

async function syncGitExcludeNonPublishableAssets(
  workspaceRoot: string,
  paths: Set<string>,
  cacheEntry: WorkspacePublishScopeCache | undefined
): Promise<void> {
  const gitDir = path.join(workspaceRoot, '.git')
  if (!existsSync(gitDir)) return

  const excludeKey = nonPublishableSetKey(paths)
  if (cacheEntry?.excludeWrittenKey === excludeKey) return

  const excludePath = path.join(gitDir, 'info', 'exclude')
  await mkdir(path.dirname(excludePath), { recursive: true })

  let preserved: string[] = []
  if (existsSync(excludePath)) {
    const raw = await readFile(excludePath, 'utf8')
    let inBlock = false
    for (const line of raw.split(/\r?\n/)) {
      if (line === GIT_EXCLUDE_NON_PUBLISHABLE_BEGIN) {
        inBlock = true
        continue
      }
      if (line === GIT_EXCLUDE_NON_PUBLISHABLE_END) {
        inBlock = false
        continue
      }
      if (!inBlock) preserved.push(line)
    }
  }

  const next = [
    ...preserved,
    GIT_EXCLUDE_NON_PUBLISHABLE_BEGIN,
    ...[...paths].sort(),
    GIT_EXCLUDE_NON_PUBLISHABLE_END,
    ''
  ]
  await writeFile(excludePath, next.join('\n'), 'utf8')
  if (cacheEntry) cacheEntry.excludeWrittenKey = excludeKey
}

async function ensureEmprintGitignoreOnce(workspaceRoot: string): Promise<void> {
  const key = publishScopeCacheKey(workspaceRoot)
  if (emprintGitignoreEnsuredRoots.has(key)) return
  await ensureEmprintGitignore(workspaceRoot)
  emprintGitignoreEnsuredRoots.add(key)
}

/**
 * Apply git index/exclude updates only when the non-publishable asset set changed.
 */
async function reconcilePublishScopeGit(
  workspaceRoot: string,
  nonPublishable: Set<string>
): Promise<void> {
  const cacheKey = publishScopeCacheKey(workspaceRoot)
  let cacheEntry = publishScopeCacheByWorkspace.get(cacheKey)
  if (!cacheEntry) {
    const index = await ensurePublishScopeIndex(workspaceRoot)
    cacheEntry = {
      fingerprint: await publishScopeFingerprint(workspaceRoot),
      index,
      nonPublishable,
      appliedNonPublishableKey: null,
      excludeWrittenKey: null
    }
    publishScopeCacheByWorkspace.set(cacheKey, cacheEntry)
  } else {
    cacheEntry.nonPublishable = nonPublishable
  }

  const appliedKey = nonPublishableSetKey(nonPublishable)
  const gitOpsNeeded = cacheEntry.appliedNonPublishableKey !== appliedKey

  let git: ReturnType<typeof simpleGit> | undefined
  try {
    git = simpleGit(workspaceRoot)
    if (!(await git.checkIsRepo())) {
      await syncGitExcludeNonPublishableAssets(workspaceRoot, nonPublishable, cacheEntry)
      return
    }
  } catch {
    await syncGitExcludeNonPublishableAssets(workspaceRoot, nonPublishable, cacheEntry)
    return
  }

  if (gitOpsNeeded) {
    await untrackNonPublishableAssets(git, nonPublishable)
    await unstageNonPublishableAssets(git, nonPublishable)
    cacheEntry.appliedNonPublishableKey = appliedKey
  }

  await syncGitExcludeNonPublishableAssets(workspaceRoot, nonPublishable, cacheEntry)
}

/**
 * Reconcile git index/exclude with which assets should ship on publish.
 * Call after post moves/deletes and other edits that change asset publish scope.
 */
export async function syncWorkspacePublishScope(workspaceRoot: string): Promise<Set<string>> {
  await ensureEmprintGitignoreOnce(workspaceRoot)
  await untrackEmprintIgnoredPathsOnce(workspaceRoot)
  const index = await ensurePublishScopeIndex(workspaceRoot)
  const fingerprint = await publishScopeFingerprint(workspaceRoot)
  const nonPublishable = nonPublishablePathsFromIndex(index)
  writePublishScopeCacheEntry(workspaceRoot, index, fingerprint, nonPublishable)
  await reconcilePublishScopeGit(workspaceRoot, nonPublishable)
  return nonPublishable
}

async function preparePublishScopeForSnapshot(workspaceRoot: string): Promise<Set<string>> {
  await ensureEmprintGitignoreOnce(workspaceRoot)
  await untrackEmprintIgnoredPathsOnce(workspaceRoot)
  const nonPublishable = await resolveNonPublishableAssetPathsCached(workspaceRoot)
  await reconcilePublishScopeGit(workspaceRoot, nonPublishable)
  return nonPublishable
}

export async function resolveOriginPlainUrl(git: ReturnType<typeof simpleGit>): Promise<string | undefined> {
  try {
    const remotes = await git.getRemotes(true)
    const origin = remotes.find((r) => r.name === 'origin') ?? remotes[0]
    return origin?.refs.fetch || origin?.refs.push
  } catch {
    return undefined
  }
}

export async function withAuthenticatedOrigin<T>(
  git: ReturnType<typeof simpleGit>,
  fn: () => Promise<T>
): Promise<T> {
  const plainUrl = await resolveOriginPlainUrl(git)
  if (!plainUrl) {
    throw new Error('No git remote is configured for this workspace.')
  }
  const session = await readGithubSession()
  if (!session) {
    throw new Error('Sign in with GitHub to sync with the remote repository.')
  }
  const authUrl = buildGithubAuthRemoteUrl(plainUrl, session.accessToken)
  const remotes = await git.getRemotes(true)
  const origin = remotes.find((r) => r.name === 'origin')
  if (!origin) {
    throw new Error('No git remote is configured for this workspace.')
  }
  await git.remote(['set-url', 'origin', authUrl])
  try {
    return await fn()
  } finally {
    await git.remote(['set-url', 'origin', plainUrl])
  }
}

export async function ensurePublishBranch(git: ReturnType<typeof simpleGit>): Promise<{
  branch: string
  branchCorrected: boolean
  previousBranch?: string
  offPublishBranch: boolean
}> {
  const status = await git.status()
  const current = status.current ?? 'HEAD'
  if (current === EMPRINT_PUBLISH_BRANCH) {
    return { branch: current, branchCorrected: false, offPublishBranch: false }
  }

  if (countPendingFiles(status) > 0 || status.conflicted.length > 0) {
    return { branch: current, branchCorrected: false, offPublishBranch: true }
  }

  try {
    await git.checkout(EMPRINT_PUBLISH_BRANCH)
    return { branch: EMPRINT_PUBLISH_BRANCH, branchCorrected: true, previousBranch: current, offPublishBranch: false }
  } catch {
    return { branch: current, branchCorrected: false, offPublishBranch: true }
  }
}

export async function gitFetchOriginMain(git: ReturnType<typeof simpleGit>): Promise<void> {
  const plainUrl = await resolveOriginPlainUrl(git)
  if (!plainUrl) return
  const session = await readGithubSession()
  if (!session) return
  await withAuthenticatedOrigin(git, async () => {
    await runGitRawWithRetry(git, ['fetch', 'origin', EMPRINT_PUBLISH_BRANCH, '--prune'])
  })
}

export async function countRevList(git: ReturnType<typeof simpleGit>, fromRef: string, toRef: string): Promise<number> {
  try {
    const raw = (await git.raw(['rev-list', '--count', `${fromRef}..${toRef}`])).trim()
    const n = Number.parseInt(raw, 10)
    return Number.isFinite(n) && n >= 0 ? n : 0
  } catch {
    return 0
  }
}

/** Compare HEAD to `origin/<publishBranch>` so behind/ahead work without upstream tracking. */
export async function resolveAheadBehind(git: ReturnType<typeof simpleGit>): Promise<{ ahead: number; behind: number }> {
  const remoteRef = `origin/${EMPRINT_PUBLISH_BRANCH}`
  try {
    await git.raw(['rev-parse', '--verify', `${remoteRef}^{commit}`])
  } catch {
    const status = await git.status()
    return { ahead: status.ahead, behind: status.behind }
  }

  const behind = await countRevList(git, 'HEAD', remoteRef)
  const ahead = await countRevList(git, remoteRef, 'HEAD')
  return { ahead, behind }
}

export async function ensureUpstreamTracksOriginMain(git: ReturnType<typeof simpleGit>, branch: string): Promise<void> {
  if (branch !== EMPRINT_PUBLISH_BRANCH) return
  try {
    await git.raw(['rev-parse', '--verify', `origin/${EMPRINT_PUBLISH_BRANCH}^{commit}`])
  } catch {
    return
  }
  try {
    await git.branch([`--set-upstream-to=origin/${EMPRINT_PUBLISH_BRANCH}`, EMPRINT_PUBLISH_BRANCH])
  } catch {
    // Already configured or branch missing — non-fatal.
  }
}

export function sendRecoverProgress(sender: WebContents, payload: GitRecoverWorkspaceProgress): void {
  if (sender.isDestroyed()) return
  sender.send(ipcChannels.gitRecoverWorkspaceProgress, payload)
}

export async function gitRecoverWorkspace(sender: WebContents, input: GitRecoverWorkspaceInput): Promise<GitRecoverWorkspaceResult> {
  const workspaceId = input.workspaceId?.trim()
  if (!workspaceId) {
    throw new Error('Workspace id is required.')
  }

  const catalog = await readCatalog()
  const entry = catalog.find((e) => e.id === workspaceId)
  if (!entry) {
    throw new Error('Workspace was not found in the catalog.')
  }
  const remoteUrl = entry.remoteUrl?.trim()
  if (!remoteUrl) {
    throw new Error('This workspace has no remote URL to restore from.')
  }

  const localDirectory = path.resolve(entry.localDirectory)
  const progress = (phase: GitRecoverWorkspaceProgress['phase'], message: string, progressPct: number) => {
    sendRecoverProgress(sender, { workspaceId, phase, message, progress: progressPct })
  }

  progress('starting', 'Preparing workspace recovery…', 5)

  const mounted = getMountedWorkspaceRoot()
  if (mounted && path.resolve(mounted) === localDirectory) {
    setMountedWorkspaceRoot(null)
    try {
      await stopSiteDevServer()
    } catch {
      // ignore
    }
  }

  progress('removing', 'Removing local copy…', 25)
  await removeWorkspaceFromDisk(localDirectory)

  const session = await readGithubSession()
  if (!session) {
    progress('error', 'GitHub sign-in is required to restore from the remote.', 0)
    throw new Error('Sign in with GitHub to restore this workspace.')
  }

  progress('cloning', 'Downloading from GitHub…', 55)
  const authUrl = buildGithubAuthRemoteUrl(remoteUrl, session.accessToken)
  const gitProvider = new SimpleGitProvider()
  await gitProvider.clone({
    directory: localDirectory,
    remoteUrl: authUrl,
    defaultBranch: EMPRINT_PUBLISH_BRANCH
  })

  await ensureEmprintGitignore(localDirectory)
  await untrackEmprintIgnoredPaths(localDirectory)

  const now = new Date().toISOString()
  const nextCatalog = catalog.map((e) =>
    e.id === workspaceId ? { ...e, localDirectory, updatedAt: now } : e
  )
  await writeCatalog(nextCatalog)

  progress('done', 'Workspace restored.', 100)
  return { workspaceId, localDirectory }
}

/**
 * Snapshot the working tree, branch, and remote relationship for the publish UI.
 * Fetches `origin/main` first so `behind` is accurate, and auto-checks out `main`
 * when an external tool left the repo on another branch with a clean tree.
 */
const gitignoreUntrackedRoots = new Set<string>()

export function invalidateUntrackEmprintIgnoredCache(workspaceRoot: string): void {
  gitignoreUntrackedRoots.delete(path.resolve(workspaceRoot))
}

export async function untrackEmprintIgnoredPathsOnce(workspaceRoot: string): Promise<void> {
  const key = path.resolve(workspaceRoot)
  if (gitignoreUntrackedRoots.has(key)) return
  await untrackEmprintIgnoredPaths(workspaceRoot)
  gitignoreUntrackedRoots.add(key)
}

export async function gitWorkingTree(directory: string): Promise<GitWorkingTreeSummary> {
  const git = simpleGit(directory)
  const branchInfo = await ensurePublishBranch(git)

  let hasRemote = false
  try {
    const remotes = await git.getRemotes(false)
    hasRemote = remotes.length > 0
  } catch {
    hasRemote = false
  }

  if (hasRemote) {
    try {
      await gitFetchOriginMain(git)
    } catch {
      // Offline or auth issues — still return a local snapshot.
    }
  }

  const nonPublishableAssets = await preparePublishScopeForSnapshot(directory)

  const status = await git.status()
  const pendingFiles = mapPendingFiles(status, nonPublishableAssets)
  const hasConflicts = status.conflicted.length > 0
  const session = await readGithubSession()
  const branch = status.current ?? branchInfo.branch
  const offPublishBranch = branch !== EMPRINT_PUBLISH_BRANCH
  const { ahead, behind } = await resolveAheadBehind(git)

  if (hasRemote && branch === EMPRINT_PUBLISH_BRANCH) {
    await ensureUpstreamTracksOriginMain(git, branch)
  }

  const hasLocalDelta = pendingFiles.length > 0 || ahead > 0 || hasConflicts

  let pullBlockedReason: GitPullSkipReason | undefined
  if (behind > 0) {
    if (!session) pullBlockedReason = 'no-session'
    else if (offPublishBranch) pullBlockedReason = 'off-branch'
  }

  const canPull =
    hasRemote && behind > 0 && !pullBlockedReason && !hasLocalDelta && !hasConflicts
  const canPullOverwrite =
    hasRemote && behind > 0 && !pullBlockedReason && hasLocalDelta

  return {
    branch,
    publishBranch: EMPRINT_PUBLISH_BRANCH,
    ahead,
    behind,
    hasUpstream: Boolean(status.tracking),
    hasRemote,
    hasGithubSession: Boolean(session),
    hasConflicts,
    offPublishBranch,
    branchCorrected: branchInfo.branchCorrected,
    ...(branchInfo.previousBranch ? { previousBranch: branchInfo.previousBranch } : {}),
    canPull,
    canPullOverwrite,
    ...(pullBlockedReason ? { pullBlockedReason } : {}),
    pendingFiles
  }
}

export async function gitPull(directory: string, input?: GitPullInput): Promise<GitPullResult> {
  const git = simpleGit(directory)
  const summary = await gitWorkingTree(directory)
  const discardLocal = input?.discardLocal === true

  if (!summary.hasRemote) {
    return { pulled: false, behind: summary.behind, branch: summary.branch, skippedReason: 'no-remote' }
  }
  if (!summary.hasGithubSession) {
    return { pulled: false, behind: summary.behind, branch: summary.branch, skippedReason: 'no-session' }
  }
  if (summary.offPublishBranch) {
    return { pulled: false, behind: summary.behind, branch: summary.branch, skippedReason: 'off-branch' }
  }
  if (summary.behind === 0) {
    return { pulled: false, behind: 0, branch: summary.branch, skippedReason: 'nothing-to-pull' }
  }

  if (discardLocal) {
    if (!summary.canPullOverwrite) {
      return {
        pulled: false,
        behind: summary.behind,
        branch: summary.branch,
        skippedReason: summary.pullBlockedReason ?? 'nothing-to-pull'
      }
    }

    try {
      await withAuthenticatedOrigin(git, async () => {
        await runGitRawWithRetry(git, ['fetch', 'origin', EMPRINT_PUBLISH_BRANCH, '--prune'])
        await runGitRawWithRetry(git, ['reset', '--hard', `origin/${EMPRINT_PUBLISH_BRANCH}`])
        await runGitRawWithRetry(git, ['clean', '-fd'])
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (/conflict|CONFLICT|merge failed|unmerged/i.test(msg)) {
        return { pulled: false, behind: summary.behind, branch: summary.branch, skippedReason: 'conflict' }
      }
      throw e
    }

    const after = await resolveAheadBehind(git)
    const status = await git.status()
    return {
      pulled: true,
      behind: after.behind,
      branch: status.current ?? summary.branch
    }
  }

  if (summary.hasConflicts) {
    return { pulled: false, behind: summary.behind, branch: summary.branch, skippedReason: 'conflict' }
  }
  if (summary.pendingFiles.length > 0) {
    return { pulled: false, behind: summary.behind, branch: summary.branch, skippedReason: 'dirty-tree' }
  }
  if (summary.ahead > 0 && summary.behind > 0) {
    return { pulled: false, behind: summary.behind, branch: summary.branch, skippedReason: 'diverged' }
  }

  try {
    await withAuthenticatedOrigin(git, async () => {
      await runGitRawWithRetry(git, ['pull', 'origin', EMPRINT_PUBLISH_BRANCH, '--no-edit'])
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (/conflict|CONFLICT|merge failed|unmerged/i.test(msg)) {
      return { pulled: false, behind: summary.behind, branch: summary.branch, skippedReason: 'conflict' }
    }
    throw e
  }

  const after = await resolveAheadBehind(git)
  const status = await git.status()
  return {
    pulled: true,
    behind: after.behind,
    branch: status.current ?? summary.branch
  }
}

/**
 * Stage every change, commit with the supplied message, and optionally push
 * to the configured remote using the stored GitHub session. Failures from
 * each phase surface as thrown errors with a human-friendly message so the
 * publish dialog can render them inline.
 */
export async function gitPublish(directory: string, input: GitPublishInput): Promise<GitPublishResult> {
  const message = (input.message ?? '').trim()
  if (!message) {
    throw new Error('Commit message is required.')
  }
  const wantPush = input.push !== false
  const git = simpleGit(directory)

  const nonPublishableAssets = await preparePublishScopeForSnapshot(directory)

  const preStatus = await git.status()
  const hasPendingChanges =
    mapPendingFiles(preStatus, nonPublishableAssets).length > 0 ||
    preStatus.conflicted.some(
      (f) => !isEmprintIgnoredPublishPath(normalizePublishPendingPath(f))
    )

  let committed = false
  let commitSha: string | undefined
  if (hasPendingChanges) {
    // Set author identity at local scope if missing, otherwise commit throws on
    // machines with no global git config. See `ensureGitAuthorIdentity` for the
    // privacy-preserving GitHub `noreply` defaults.
    const session = await readGithubSession()
    await ensureGitAuthorIdentity(git, session)

    await gitStagePublishableChanges(git, directory)
    const commitResult = await git.commit(message)
    committed = true
    commitSha = commitResult.commit || undefined
  }

  const branch = preStatus.current ?? 'HEAD'

  if (!wantPush) {
    return { committed, pushed: false, branch, pushSkippedReason: 'disabled', ...(commitSha ? { commitSha } : {}) }
  }

  // Resolve a remote URL to push to. Prefer `origin`, then fall back to the
  // first configured remote.
  let remoteUrl: string | undefined
  try {
    const remotes = await git.getRemotes(true)
    const origin = remotes.find((r) => r.name === 'origin') ?? remotes[0]
    remoteUrl = origin?.refs.push || origin?.refs.fetch
  } catch {
    remoteUrl = undefined
  }
  if (!remoteUrl) {
    return { committed, pushed: false, branch, pushSkippedReason: 'no-remote', ...(commitSha ? { commitSha } : {}) }
  }

  const session = await readGithubSession()
  if (!session) {
    return { committed, pushed: false, branch, pushSkippedReason: 'no-session', ...(commitSha ? { commitSha } : {}) }
  }

  if (isQaMockGitPushEnabled()) {
    return { ...mockGitPushResult(branch), ...(commitSha ? { commitSha } : {}) }
  }

  const postStatus = await git.status()
  const nothingToPush = !committed && postStatus.ahead === 0
  if (nothingToPush) {
    return { committed, pushed: false, branch, pushSkippedReason: 'nothing-to-push', ...(commitSha ? { commitSha } : {}) }
  }

  const authUrl = buildGithubAuthRemoteUrl(remoteUrl, session.accessToken)
  await runGitRawWithRetry(git, ['push', authUrl, `HEAD:${branch}`])

  return {
    committed,
    pushed: true,
    branch,
    pushedTo: remoteUrl,
    ...(commitSha ? { commitSha } : {})
  }
}

const GIT_LOG_FIELD_SEP = '\x1f'
const GIT_LOG_RECORD_SEP = '\x1e'

/** Parse the output of `git log --pretty=format:...` using non-printing separators. */
export function parseGitLogOutput(raw: string): GitCommitNode[] {
  const records = raw.split(GIT_LOG_RECORD_SEP).map((r) => r.replace(/^\n/, '')).filter((r) => r.length > 0)
  const nodes: GitCommitNode[] = []
  for (const record of records) {
    const fields = record.split(GIT_LOG_FIELD_SEP)
    if (fields.length < 7) continue
    const [sha, shortSha, parentsRaw, refsRaw, authoredAt, authorName, authorEmail, ...rest] = fields
    if (!sha) continue
    const message = (rest.join(GIT_LOG_FIELD_SEP) ?? '').replace(/\s+$/, '')
    const summary = message.split(/\r?\n/)[0] ?? ''
    const parents = (parentsRaw ?? '').trim().length > 0 ? (parentsRaw as string).trim().split(/\s+/) : []
    const refs = (refsRaw ?? '')
      .replace(/^\s*\(/, '')
      .replace(/\)\s*$/, '')
      .split(',')
      .map((r) => r.trim())
      .filter((r) => r.length > 0)
    nodes.push({
      sha,
      shortSha: shortSha ?? sha.slice(0, 7),
      parents,
      refs,
      message,
      summary,
      authorName: authorName ?? '',
      authorEmail: authorEmail ?? '',
      authoredAt: authoredAt ?? ''
    })
  }
  return nodes
}

/**
 * Make the working tree (and index) match `sourceRef` while keeping `HEAD`
 * unchanged so older Imprint entries remain on the timeline.
 */
export async function gitRestoreWorkingTreeFromRef(
  directory: string,
  sourceRef: string
): Promise<{ hadLocalChanges: boolean }> {
  const git = simpleGit(directory)
  const before = await git.status()
  const hadLocalChanges = mapPendingFiles(before).length > 0

  await ensureEmprintGitignore(directory)

  try {
    await git.raw(['rev-parse', '--verify', `${sourceRef}^{commit}`])
  } catch {
    throw new Error('Could not find that version in this workspace.')
  }

  await runGitRawWithRetry(git, ['restore', '--source', sourceRef, '--worktree', '--staged', ':/'])
  await runGitRawWithRetry(git, ['clean', '-fd'])

  return { hadLocalChanges }
}

export async function assertImprintCommitReachable(git: ReturnType<typeof simpleGit>, sha: string): Promise<void> {
  const status = await git.status()
  if (status.current !== EMPRINT_PUBLISH_BRANCH) {
    throw new Error('Switch to the main publishing line before restoring an Imprint.')
  }
  try {
    await git.raw(['merge-base', '--is-ancestor', sha, 'HEAD'])
  } catch {
    throw new Error('That Imprint point is not on your current publishing line.')
  }
}

export async function gitRollback(directory: string, input: GitRollbackInput): Promise<GitRollbackResult> {
  const sha = input.sha?.trim()
  if (!sha) {
    throw new Error('An Imprint entry is required.')
  }

  const git = simpleGit(directory)
  await ensurePublishBranch(git)
  await assertImprintCommitReachable(git, sha)

  const { hadLocalChanges } = await gitRestoreWorkingTreeFromRef(directory, sha)
  return { sha, restored: true, hadLocalChanges }
}

export async function gitResetDraft(directory: string): Promise<GitResetDraftResult> {
  const git = simpleGit(directory)
  await ensurePublishBranch(git)

  try {
    await git.raw(['rev-parse', '--verify', 'HEAD^{commit}'])
  } catch {
    const before = mapPendingFiles(await git.status())
    await ensureEmprintGitignore(directory)
    await runGitRawWithRetry(git, ['clean', '-fd'])
    return { restored: true, hadLocalChanges: before.length > 0 }
  }

  const { hadLocalChanges } = await gitRestoreWorkingTreeFromRef(directory, 'HEAD')
  return { restored: true, hadLocalChanges }
}

export async function gitLog(directory: string, input: GitLogInput): Promise<GitCommitNode[]> {
  const limit = Math.max(1, Math.min(input.limit ?? 200, 1000))
  const allBranches = input.allBranches !== false
  const format = [
    '%H', // full SHA
    '%h', // short SHA
    '%P', // parent SHAs
    '%D', // ref names (decoration)
    '%aI', // author date, ISO 8601 strict
    '%an', // author name
    '%ae', // author email
    '%B' // raw body (subject + body)
  ].join(GIT_LOG_FIELD_SEP)

  const args = [
    'log',
    `--max-count=${limit}`,
    `--pretty=format:${format}${GIT_LOG_RECORD_SEP}`
  ]
  if (allBranches) args.push('--all')

  const git = simpleGit(directory)
  try {
    const raw = await git.raw(args)
    return parseGitLogOutput(raw)
  } catch (e) {
    // Empty repository (no commits yet) raises a non-zero exit. Surface as [].
    const msg = e instanceof Error ? e.message : String(e)
    if (/does not have any commits yet|unknown revision|bad default revision/i.test(msg)) {
      return []
    }
    throw e
  }
}

/**
 * Append a line to `.gitignore` if (and only if) no equivalent entry already
 * exists. We treat the entry conceptually — "ignore the drafts folder" — so
 * `drafts`, `/drafts`, `drafts/`, and `/drafts/` are all considered equivalent
 * and a no-op. The file is created on the fly if missing.
 *
 * This is a guardrail: by convention emprint's drafts/ folder is a private
 * staging area that should never be pushed. Centralizing this here means the
 * UI never has to surface the convention to non-developer users.
 */
export async function ensureGitignoreLine(workspaceRoot: string, rawLine: string): Promise<void> {
  const target = rawLine.trim()
  if (!target) return
  const filePath = path.join(workspaceRoot, '.gitignore')

  let content = ''
  try {
    content = await readFile(filePath, 'utf8')
  } catch (err) {
    const code = err && typeof err === 'object' && 'code' in err ? (err as NodeJS.ErrnoException).code : ''
    if (code !== 'ENOENT') throw err
  }

  const baseName = target.replace(/^\/+/, '').replace(/\/+$/, '')
  const variants = new Set([
    baseName,
    `${baseName}/`,
    `/${baseName}`,
    `/${baseName}/`
  ])

  const lines = content.split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    if (variants.has(trimmed)) return
  }

  const needsLeadingNewline = content.length > 0 && !content.endsWith('\n')
  const updated = `${content}${needsLeadingNewline ? '\n' : ''}${target}\n`
  await writeFile(filePath, updated, 'utf8')
}

/**
 * The set of paths emprint considers private by convention and therefore
 * always wants represented in `.gitignore`. Currently just `drafts/` — extend
 * this list rather than touching the gitignore machinery directly.
 */
export async function ensureEmprintGitignore(workspaceRoot: string): Promise<void> {
  for (const line of EMPRINT_GITIGNORE_LINES) {
    await ensureGitignoreLine(workspaceRoot, line)
  }
}

/**
 * Best-effort migration for workspaces created before `drafts/` was declared
 * private. If any files inside the always-ignored paths are still tracked by
 * git, untrack them (keep the working-tree copy) so the next publish sees
 * them as removed and pushes a clean tree. Failures here are intentionally
 * swallowed: the workspace may not be a git repo yet (e.g. immediately after
 * `workspace:initialize`), nothing is tracked, or git is unavailable — all
 * acceptable no-ops.
 */
export async function untrackEmprintIgnoredPaths(workspaceRoot: string): Promise<void> {
  let git: ReturnType<typeof simpleGit>
  try {
    git = simpleGit(workspaceRoot)
    const isRepo = await git.checkIsRepo()
    if (!isRepo) return
  } catch {
    return
  }

  for (const candidate of EMPRINT_GITIGNORE_LINES) {
    if (candidate.includes('*')) continue
    const normalized = candidate.replace(/\/+$/, '')
    if (!normalized) continue
    const rmArgs = ['rm', '--cached', '--ignore-unmatch']
    if (candidate.endsWith('/')) rmArgs.push('-r')
    rmArgs.push(normalized)
    try {
      // `--cached` removes from the index only, leaving the working tree
      // untouched. `--ignore-unmatch` keeps git from erroring out when the
      // path is already untracked. `-r` is needed for folders.
      await git.raw(rmArgs)
    } catch {
      // ignored on purpose — see function-level comment
    }
  }
}

/**
 * Stage working-tree changes for publish while keeping Emprint-private paths
 * (e.g. `drafts/`) out of the index even if they were tracked historically.
 */
export async function gitStagePublishableChanges(
  git: ReturnType<typeof simpleGit>,
  workspaceRoot: string
): Promise<void> {
  const nonPublishableAssets = await resolveNonPublishableAssetPathsCached(workspaceRoot)
  await git.add(['-A', '.'])
  for (const entry of EMPRINT_GITIGNORE_LINES) {
    if (entry.includes('*')) continue
    const pathspec = entry.replace(/\/+$/, '') || entry
    try {
      await git.raw(['reset', 'HEAD', '--', pathspec])
    } catch {
      // path was not staged
    }
  }
  await unstageNonPublishableAssets(git, nonPublishableAssets)
}

export function buildGithubAuthRemoteUrl(remoteUrl: string, token: string): string {
  const parsed = new URL(remoteUrl)
  if (parsed.protocol !== 'https:' || parsed.hostname !== 'github.com') {
    throw new Error('Only https://github.com remotes are supported for authenticated push in this MVP.')
  }
  const safeToken = encodeURIComponent(token)
  parsed.username = 'x-access-token'
  parsed.password = safeToken
  return parsed.toString()
}

/** Removes the workspace directory tree. Skips missing paths; refuses a few protected roots. */
export async function removeWorkspaceFromDisk(localDirectory: string): Promise<void> {
  const resolved = path.resolve(localDirectory.trim())
  if (!resolved) {
    throw new Error('Invalid workspace path.')
  }

  const home = path.resolve(homedir())
  const userData = path.resolve(app.getPath('userData'))
  if (resolved === home || resolved === userData) {
    throw new Error('Cannot remove a protected system folder.')
  }

  const root = path.parse(resolved).root
  if (resolved === path.resolve(root)) {
    throw new Error('Cannot remove filesystem root.')
  }

  let stats: Awaited<ReturnType<typeof stat>>
  try {
    stats = await stat(resolved)
  } catch (err: unknown) {
    const code = err && typeof err === 'object' && 'code' in err ? (err as NodeJS.ErrnoException).code : ''
    if (code === 'ENOENT') {
      return
    }
    throw err
  }

  if (!stats.isDirectory()) {
    throw new Error('Workspace path is not a directory.')
  }

  await rm(resolved, { recursive: true, force: true })
}

export function toPosixWorkspacePath(filePath: string): string {
  return filePath.split(path.sep).join('/')
}

export function isValidSrcEntryName(name: string): boolean {
  if (!name || name === '.' || name === '..') return false
  // POSIX-style separator and Windows-style drive/sep characters.
  if (/[\\/]/.test(name)) return false
  // Disallow names that are pure whitespace.
  if (!name.trim()) return false
  return true
}

export function resolveSafeSectionsPath(workspaceRoot: string, inputPath: string): string {
  const normalized = inputPath.replace(/\\/g, '/').replace(/^\/+/, '')
  if (!normalized || hasPathTraversalSegment(normalized)) {
    throw new Error('Invalid path.')
  }
  if (!normalized.startsWith(`${WORKSPACE_DIR.sections}/`)) {
    throw new Error('Path must be under sections/.')
  }
  const abs = path.resolve(workspaceRoot, ...normalized.split('/'))
  const sectionsRoot = path.resolve(workspaceRoot, WORKSPACE_DIR.sections)
  const rel = path.relative(sectionsRoot, abs)
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error('Path escapes sections/.')
  }
  if (!abs.toLowerCase().endsWith('.json')) {
    throw new Error('Only JSON section files can be edited here.')
  }
  return abs
}

export function resolveSafePostsOrDraftsPath(workspaceRoot: string, inputPath: string): string {
  return resolveSafeKnowledgeOrPostsPath(workspaceRoot, inputPath, 'column')
}

export function resolveSafeKnowledgeOrPostsPath(
  workspaceRoot: string,
  inputPath: string,
  kind: SiteProjectKind = resolveWorkspaceSiteProjectKind(workspaceRoot)
): string {
  const normalized = inputPath.replace(/\\/g, '/').replace(/^\/+/, '')
  if (!normalized || hasPathTraversalSegment(normalized)) {
    throw new Error('Invalid path.')
  }
  const publishedPrefix = `${publishedMarkdownSection(kind)}/`
  if (!normalized.startsWith(publishedPrefix) && !normalized.startsWith('drafts/')) {
    throw new Error(`Path must be under ${publishedPrefix} or drafts/.`)
  }
  const abs = path.resolve(workspaceRoot, ...normalized.split('/'))
  const publishedRoot = path.resolve(workspaceRoot, publishedMarkdownSection(kind))
  const draftsRoot = path.resolve(workspaceRoot, WORKSPACE_DIR.drafts)
  const inPublished =
    !path.relative(publishedRoot, abs).startsWith('..') &&
    !path.isAbsolute(path.relative(publishedRoot, abs))
  const inDrafts =
    !path.relative(draftsRoot, abs).startsWith('..') && !path.isAbsolute(path.relative(draftsRoot, abs))
  if (!inPublished && !inDrafts) {
    throw new Error('Path escapes allowed content folders.')
  }
  return abs
}

export function resolveSafeKnowledgePath(workspaceRoot: string, inputPath: string): string {
  return resolveSafeKnowledgeOrPostsPath(workspaceRoot, inputPath, 'dictionary')
}


export async function safeListDirectory(directory: string): Promise<string[]> {
  try {
    return await readdir(directory)
  } catch {
    return []
  }
}

export function summarizeMarkdown(relativePath: string, content: string, fallbackUpdatedAt: string): PostSummary {
  const summary = parsePostSummary(relativePath, content)
  if (!summary.updatedAt && fallbackUpdatedAt) {
    return { ...summary, updatedAt: fallbackUpdatedAt }
  }
  return summary
}

export function summarizeKnowledge(
  relativePath: string,
  content: string,
  fallbackUpdatedAt: string
): KnowledgeSummary {
  const summary = parseKnowledgeSummary(relativePath, content)
  if (!summary.updatedAt && fallbackUpdatedAt) {
    return { ...summary, updatedAt: fallbackUpdatedAt }
  }
  return summary
}

export async function buildKnowledgeIndexTree(workspaceRoot: string): Promise<import('@emprint/shared').IndexTreeNode[]> {
  const { buildRegistryIndexTree } = await import('./index-registry-core')
  return await buildRegistryIndexTree(workspaceRoot)
}

export function inferTitleFromPath(relativePath: string): string {
  const name = relativePath.split('/').pop() ?? relativePath
  return name.replace(/\.md$/i, '').replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/-/g, ' ') || 'Untitled'
}

/* ------------------------------------------------------------------------------------ */
/* Assets (workspace `assets/images/`)                                                  */
/* ------------------------------------------------------------------------------------ */

const ASSET_IMAGE_MIME_ALLOWLIST: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg'
}

export function slugifyAssetBaseName(fileName: string): string {
  const withoutExt = fileName.replace(/\.[a-z0-9]+$/i, '')
  const slug = withoutExt
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
  return slug || 'image'
}

export function buildUniqueAssetPath(imagesDir: string, baseName: string, ext: string): string {
  let candidate = path.join(imagesDir, `${baseName}.${ext}`)
  let counter = 2
  while (existsSync(candidate)) {
    candidate = path.join(imagesDir, `${baseName}-${counter}.${ext}`)
    counter++
  }
  return candidate
}

export async function saveAssetImage(
  workspaceRoot: string,
  input: { fileName: string; data: Uint8Array; mimeType: string }
): Promise<AssetImageInfo> {
  const ext = ASSET_IMAGE_MIME_ALLOWLIST[input.mimeType]
  if (!ext) {
    throw new Error(`Unsupported image type: ${input.mimeType}`)
  }
  const data = input.data instanceof Uint8Array ? input.data : new Uint8Array(input.data as unknown as ArrayBuffer)
  if (data.byteLength > MAX_ASSET_IMAGE_BYTES) {
    throw new Error(
      `Image exceeds the 20MB upload limit (${(data.byteLength / (1024 * 1024)).toFixed(1)}MB). Reduce the size and try again.`
    )
  }
  if (data.byteLength === 0) {
    throw new Error('Empty image data.')
  }

  const baseName = slugifyAssetBaseName(input.fileName)
  const imagesDir = path.join(workspaceRoot, WORKSPACE_DIR.assetsImages)
  await mkdir(imagesDir, { recursive: true })
  const absPath = buildUniqueAssetPath(imagesDir, baseName, ext)
  await writeFile(absPath, data, { flag: 'wx' })

  const st = await stat(absPath)
  const relPath = toPosixWorkspacePath(path.relative(workspaceRoot, absPath))
  return {
    path: relPath,
    name: path.basename(absPath),
    size: st.size,
    mimeType: input.mimeType,
    modifiedAt: st.mtime.toISOString(),
    references: [],
    publishScope: 'orphan'
  }
}

export function resolveSafeAssetPath(workspaceRoot: string, inputPath: string): string {
  const normalized = inputPath.replace(/\\/g, '/').replace(/^\/+/, '')
  if (!normalized || hasPathTraversalSegment(normalized)) {
    throw new Error('Invalid asset path.')
  }
  if (!normalized.startsWith(`${WORKSPACE_DIR.assets}/`)) {
    throw new Error('Asset path must start with assets/.')
  }
  const abs = path.resolve(workspaceRoot, ...normalized.split('/'))
  const assetsRoot = path.resolve(workspaceRoot, WORKSPACE_DIR.assets)
  const rel = path.relative(assetsRoot, abs)
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error('Path escapes assets/.')
  }
  return abs
}

export async function deleteAssetImage(workspaceRoot: string, relativePath: string): Promise<void> {
  const abs = resolveSafeAssetPath(workspaceRoot, relativePath)
  const st = await stat(abs)
  if (!st.isFile()) {
    throw new Error('Not a file.')
  }
  await unlink(abs)
}

export function mimeTypeForExtension(ext: string): string {
  switch (ext.toLowerCase()) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'png':
      return 'image/png'
    case 'webp':
      return 'image/webp'
    case 'gif':
      return 'image/gif'
    case 'svg':
      return 'image/svg+xml'
    default:
      return 'application/octet-stream'
  }
}

const MARKDOWN_IMAGE_RE = /!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g
const HTML_IMG_SRC_RE = /<img[^>]+src\s*=\s*["']([^"']+)["'][^>]*>/gi

export function normalizeReferenceTarget(reference: string): string | null {
  try {
    // Drop URL schemes (http://, https://, mailto:, ...).
    if (/^[a-z][a-z0-9+.-]*:/i.test(reference)) {
      // Allow our internal scheme.
      if (reference.startsWith('emprint-asset://')) {
        return reference
          .replace(/^emprint-asset:\/\//i, '')
          .replace(/^\/+/, '')
      }
      return null
    }
  } catch {
    return null
  }
  // Drop query/hash if any.
  const clean = reference.split('#')[0]!.split('?')[0]!.trim()
  if (!clean) return null
  // Strip leading slash to make root-relative paths comparable to workspace-relative ones.
  return clean.replace(/^\.\//, '').replace(/^\/+/, '')
}

function* extractMarkdownImageRefs(markdown: string): Generator<string> {
  for (const m of markdown.matchAll(MARKDOWN_IMAGE_RE)) {
    if (m[1]) yield m[1]
  }
  for (const m of markdown.matchAll(HTML_IMG_SRC_RE)) {
    if (m[1]) yield m[1]
  }
}

export async function listAssetImages(workspaceRoot: string): Promise<AssetImageInfo[]> {
  const imagesDir = path.join(workspaceRoot, WORKSPACE_DIR.assetsImages)
  if (!existsSync(imagesDir)) {
    return []
  }

  const dirents = await readdir(imagesDir, { withFileTypes: true })
  const images: AssetImageInfo[] = []
  for (const ent of dirents) {
    if (!ent.isFile()) continue
    const ext = ent.name.split('.').pop()?.toLowerCase() ?? ''
    if (!Object.values(ASSET_IMAGE_MIME_ALLOWLIST).includes(ext)) continue
    const abs = path.join(imagesDir, ent.name)
    const st = await stat(abs)
    images.push({
      path: toPosixWorkspacePath(path.relative(workspaceRoot, abs)),
      name: ent.name,
      size: st.size,
      mimeType: mimeTypeForExtension(ext),
      modifiedAt: st.mtime.toISOString(),
      references: [],
      publishScope: 'orphan'
    })
  }

  // Build lookup keys for each image so we can match many path variants.
  const imageByKey = new Map<string, AssetImageInfo>()
  for (const img of images) {
    imageByKey.set(img.path, img) // assets/images/foo.jpg
    imageByKey.set(img.name, img) // foo.jpg
  }

  const kind = resolveWorkspaceSiteProjectKind(workspaceRoot)
  const published = publishedMarkdownSection(kind)
  const sections: Array<{ section: AssetReference['section']; dir: string }> = [
    { section: published, dir: path.join(workspaceRoot, published) },
    { section: 'drafts', dir: path.join(workspaceRoot, WORKSPACE_DIR.drafts) }
  ]

  for (const { section, dir } of sections) {
    if (!existsSync(dir)) continue
    const files = await safeListDirectory(dir)
    for (const fileName of files) {
      if (!fileName.toLowerCase().endsWith('.md')) continue
      const postRelPath = `${section}/${fileName}`
      const absPostPath = path.join(dir, fileName)
      let content: string
      try {
        content = await readFile(absPostPath, 'utf8')
      } catch {
        continue
      }
      const title =
        section === 'knowledge'
          ? parseKnowledgeSummary(postRelPath, content).title
          : summarizeMarkdown(postRelPath, content, '').title
      for (const ref of extractMarkdownImageRefs(content)) {
        const target = normalizeReferenceTarget(ref)
        if (!target) continue
        const hit = imageByKey.get(target) ?? imageByKey.get(target.split('/').pop()!)
        if (!hit) continue
        if (hit.references.some((r) => r.postPath === postRelPath)) continue
        const reference: AssetReference = {
          postPath: postRelPath,
          postTitle: title,
          section
        }
        hit.references.push(reference)
      }
    }
  }

  for (const image of images) {
    image.publishScope = classifyAssetPublishScope(image.references)
  }

  images.sort((a, b) => (a.modifiedAt < b.modifiedAt ? 1 : -1))
  return images
}
