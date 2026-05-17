import { existsSync } from 'node:fs'
import path from 'node:path'
import { homedir } from 'node:os'
import { mkdir, readFile, rename as fsRename, rm, stat, unlink, writeFile, readdir } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { BrowserWindow, app, dialog, ipcMain, type WebContents } from 'electron'
import { WorkspaceBootstrapper } from './workspace/bootstrapper'
import {
  ipcChannels,
  MAX_ASSET_IMAGE_BYTES,
  hasPathTraversalSegment,
  parseGithubRepoFromRemoteUrl,
  parseWorkspaceConfig,
  type AssetImageInfo,
  type AssetReference,
  type GitHubAuthStatus,
  type GitHubDeviceCode,
  type GitHubRepoCreateInput,
  type GitHubRepoCreateResult,
  type GitCommitNode,
  type GitDetectResult,
  type GitInitialSyncResult,
  type GitLogInput,
  EMPRINT_PUBLISH_BRANCH,
  type GitPublishInput,
  type GitPublishResult,
  type GitPullInput,
  type GitPullResult,
  type GitPullSkipReason,
  type GitRecoverWorkspaceInput,
  type GitRecoverWorkspaceProgress,
  type GitRecoverWorkspaceResult,
  type GitWorkingTreeSummary,
  type PostSummary,
  type WorkspaceCatalogEntry,
  type WorkspaceManifest,
  type WorkspaceSrcTreeNode
} from '@emprint/shared'
import matter from 'gray-matter'
import { NodeFileSystemGateway } from './infrastructure/node-file-system-gateway'
import { setGitBinaryPath, SimpleGitProvider, SimpleGitProviderFactory } from './infrastructure/simple-git-provider'
import simpleGit from 'simple-git'
import { MANIFEST_RELATIVE_PATH, WORKSPACE_DIR } from './workspace-paths'
import {
  getSiteDevServerState,
  openSiteDevPreview,
  stopSiteDevServer
} from './site-dev-server'
import { resolveWorkspaceMonacoTypescript } from './workspace-monaco-ts'

let mountedWorkspaceRoot: string | null = null
let resolvedGitBinaryPath: string | null = null

/** Read-only accessor used by the asset protocol and other read-side helpers. */
export function getMountedWorkspaceRoot(): string | null {
  return mountedWorkspaceRoot
}

export function setupIpcHandlers(): void {
  const bootstrapper = new WorkspaceBootstrapper({
    fileSystem: new NodeFileSystemGateway(),
    gitProviderFactory: new SimpleGitProviderFactory()
  })

  ipcMain.handle(ipcChannels.systemGetRuntimeInfo, async () => ({
    appName: app.getName(),
    appVersion: app.getVersion(),
    platform: process.platform,
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node
  }))

  ipcMain.handle(ipcChannels.siteDevStop, async () => stopSiteDevServer())

  ipcMain.handle(ipcChannels.siteDevStatus, async () => getSiteDevServerState())

  ipcMain.handle(ipcChannels.siteDevOpenPreview, async () => {
    const root = ensureWorkspaceMounted()
    return openSiteDevPreview(root)
  })

  ipcMain.handle(ipcChannels.workspaceMonacoTypescript, async () => {
    const root = ensureWorkspaceMounted()
    return resolveWorkspaceMonacoTypescript(root)
  })

  ipcMain.handle(ipcChannels.systemSelectDirectory, async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory']
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    return {
      directory: result.filePaths[0]
    }
  })

  ipcMain.handle(ipcChannels.githubOAuthClientGet, async () => {
    return await githubOAuthClientGet()
  })

  ipcMain.handle(
    ipcChannels.githubOAuthClientSet,
    async (_event, input: { clientId: string; clientSecret?: string }) => {
      return await githubOAuthClientSet(input)
    }
  )

  ipcMain.handle(ipcChannels.githubAuthStatus, async () => {
    return await githubAuthStatus()
  })

  ipcMain.handle(ipcChannels.githubAuthStart, async (_event, input: { scopes: string[] }) => {
    return await githubAuthStart(input)
  })

  ipcMain.handle(ipcChannels.githubAuthPoll, async (_event, input: { deviceCode: string }) => {
    return await githubAuthPoll(input)
  })

  ipcMain.handle(ipcChannels.githubLogout, async () => {
    await githubLogout()
  })

  ipcMain.handle(ipcChannels.githubRepoCreate, async (_event, input: GitHubRepoCreateInput) => {
    return await githubRepoCreate(input)
  })

  ipcMain.handle(ipcChannels.catalogList, async () => {
    return await readCatalog()
  })

  ipcMain.handle(ipcChannels.catalogAdd, async (_event, input: Omit<WorkspaceCatalogEntry, 'createdAt' | 'updatedAt'> & { createdAt?: string; updatedAt?: string }) => {
    const now = new Date().toISOString()
    const entry: WorkspaceCatalogEntry = {
      ...input,
      createdAt: input.createdAt ?? now,
      updatedAt: input.updatedAt ?? now
    }
    const next = upsertCatalogEntry(await readCatalog(), entry)
    await writeCatalog(next)
    return entry
  })

  ipcMain.handle(ipcChannels.catalogRemove, async (_event, input: { id: string; deleteRemote?: boolean }) => {
    const catalog = await readCatalog()
    const entry = catalog.find((e) => e.id === input.id)
    if (!entry) {
      return
    }

    const dir = path.resolve(entry.localDirectory.trim())

    if (input.deleteRemote && entry.remoteUrl?.trim()) {
      const repoRef = parseGithubRepoFromRemoteUrl(entry.remoteUrl)
      if (repoRef) {
        await githubRepoDeleteRemote(repoRef.owner, repoRef.repo)
      }
    }

    await removeWorkspaceFromDisk(dir)

    if (mountedWorkspaceRoot && path.resolve(mountedWorkspaceRoot) === dir) {
      mountedWorkspaceRoot = null
      await stopSiteDevServer()
    }

    const next = catalog.filter((e) => e.id !== input.id)
    await writeCatalog(next)
  })

  ipcMain.handle(ipcChannels.workspaceInitialize, async (_event, payload: unknown) => {
    const config = parseWorkspaceConfig(payload)
    const initializedWorkspace = await bootstrapper.initialize(config)

    // Guarantee `drafts/` (and any future private paths) are ignored before
    // the renderer triggers the first commit, so a fresh workspace's first
    // commit never accidentally captures private drafts.
    await ensureEmprintGitignore(initializedWorkspace.workspaceRoot)
    // Defensive: clone-mode workspaces may already have tracked files under
    // ignored paths (drafts/). Run the same migration pass we do on open so
    // those stop showing up in the publish dialog from the very first commit.
    await untrackEmprintIgnoredPaths(initializedWorkspace.workspaceRoot)

    await stopSiteDevServer()
    mountedWorkspaceRoot = initializedWorkspace.workspaceRoot

    return initializedWorkspace
  })

  ipcMain.handle(ipcChannels.workspaceOpen, async (_event, input: { localDirectory: string }) => {
    const workspaceRoot = path.resolve(input.localDirectory)
    if (mountedWorkspaceRoot && path.resolve(mountedWorkspaceRoot) !== workspaceRoot) {
      await stopSiteDevServer()
    }
    const manifestPath = path.join(workspaceRoot, MANIFEST_RELATIVE_PATH)
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as WorkspaceManifest

    // Migration: existing workspaces may pre-date the "drafts is private"
    // convention. Silently update `.gitignore` and untrack any files inside
    // those paths so they disappear from the publish flow at the next save.
    await ensureEmprintGitignore(workspaceRoot)
    await untrackEmprintIgnoredPaths(workspaceRoot)

    mountedWorkspaceRoot = workspaceRoot

    // Minimal InitializeWorkspaceResult shape for the renderer shell.
    return {
      workspaceRoot,
      createdFiles: [],
      manifest
    }
  })

  ipcMain.handle(ipcChannels.gitInitialSync, async (_event, input: { directory: string; remoteUrl?: string; branch?: string }) => {
    return await gitInitialSync(input)
  })

  ipcMain.handle(ipcChannels.gitDetect, async () => {
    const detected = await gitDetect()
    return detected
  })

  ipcMain.handle(ipcChannels.gitWorkingTree, async () => {
    const root = ensureWorkspaceMounted()
    return await gitWorkingTree(root)
  })

  ipcMain.handle(ipcChannels.gitPull, async (_event, input?: GitPullInput) => {
    const root = ensureWorkspaceMounted()
    return await gitPull(root, input)
  })

  ipcMain.handle(ipcChannels.gitRecoverWorkspace, async (event, input: GitRecoverWorkspaceInput) => {
    return await gitRecoverWorkspace(event.sender, input)
  })

  ipcMain.handle(ipcChannels.gitPublish, async (_event, input: GitPublishInput) => {
    const root = ensureWorkspaceMounted()
    return await gitPublish(root, input)
  })

  ipcMain.handle(ipcChannels.gitLog, async (_event, input?: GitLogInput) => {
    const root = ensureWorkspaceMounted()
    return await gitLog(root, input ?? {})
  })

  ipcMain.handle(ipcChannels.postsList, async (_event, input: { section: 'posts' | 'drafts' }) => {
    const root = ensureWorkspaceMounted()
    const directory = path.join(root, input.section)
    const entries = await safeListDirectory(directory)
    const markdownFiles = entries.filter((entry) => entry.toLowerCase().endsWith('.md'))

    const summaries = await Promise.all(
      markdownFiles.map(async (fileName) => {
        const relativePath = `${input.section}/${fileName}`
        const absolutePath = path.join(root, relativePath)
        const content = await readFile(absolutePath, 'utf8')
        const stats = await stat(absolutePath)
        return summarizeMarkdown(relativePath, content, stats.mtime.toISOString())
      })
    )

    return summaries.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
  })

  ipcMain.handle(ipcChannels.postRead, async (_event, input: { path: string }) => {
    const root = ensureWorkspaceMounted()
    const absolutePath = path.join(root, input.path)
    const content = await readFile(absolutePath, 'utf8')
    return { path: input.path, content }
  })

  ipcMain.handle(ipcChannels.postSave, async (_event, input: { path: string; content: string }) => {
    const root = ensureWorkspaceMounted()
    const absolutePath = path.join(root, input.path)
    await writeFile(absolutePath, input.content, 'utf8')
    return { path: input.path }
  })

  ipcMain.handle(ipcChannels.postsMove, async (_event, input: { from: string; to: string }) => {
    const root = ensureWorkspaceMounted()
    const fromAbs = resolveSafePostsOrDraftsPath(root, input.from)
    const toAbs = resolveSafePostsOrDraftsPath(root, input.to)
    if (path.resolve(fromAbs) === path.resolve(toAbs)) {
      return { path: toPosixWorkspacePath(path.relative(root, fromAbs)) }
    }
    if (existsSync(toAbs)) {
      throw new Error('A file with this name already exists at the destination.')
    }
    await mkdir(path.dirname(toAbs), { recursive: true })
    await fsRename(fromAbs, toAbs)
    return { path: toPosixWorkspacePath(path.relative(root, toAbs)) }
  })

  ipcMain.handle(ipcChannels.postsDelete, async (_event, input: { path: string }) => {
    const root = ensureWorkspaceMounted()
    const abs = resolveSafePostsOrDraftsPath(root, input.path)
    // The safe-path helper only validates roots; refuse to delete the directories
    // themselves (e.g. accidentally passing `posts/`) so a single off-by-one in the
    // renderer can't wipe an entire section.
    const st = await stat(abs).catch(() => null)
    if (!st) {
      throw new Error('File not found.')
    }
    if (!st.isFile()) {
      throw new Error('Only individual files can be deleted from posts/ or drafts/.')
    }
    if (!abs.toLowerCase().endsWith('.md')) {
      throw new Error('Only markdown files can be deleted here.')
    }
    await unlink(abs)
    return { path: toPosixWorkspacePath(path.relative(root, abs)) }
  })

  ipcMain.handle(ipcChannels.workspaceSrcListTree, async () => {
    const root = ensureWorkspaceMounted()
    return await listWorkspaceSrcTree(root)
  })

  ipcMain.handle(ipcChannels.workspaceSrcRead, async (_event, input: { path: string }) => {
    const root = ensureWorkspaceMounted()
    const abs = resolveSafeSrcFilePath(root, input.path)
    const st = await stat(abs)
    if (!st.isFile()) {
      throw new Error('Not a file.')
    }
    const content = await readFile(abs, 'utf8')
    return { path: toPosixWorkspacePath(path.relative(root, abs)), content }
  })

  ipcMain.handle(ipcChannels.workspaceSrcSave, async (_event, input: { path: string; content: string }) => {
    const root = ensureWorkspaceMounted()
    const abs = resolveSafeSrcFilePath(root, input.path)
    await mkdir(path.dirname(abs), { recursive: true })
    await writeFile(abs, input.content, 'utf8')
    return { path: toPosixWorkspacePath(path.relative(root, abs)) }
  })

  ipcMain.handle(ipcChannels.workspaceSrcCreate, async (_event, input: { path: string; kind: 'file' | 'directory' }) => {
    const root = ensureWorkspaceMounted()
    if (input.kind !== 'file' && input.kind !== 'directory') {
      throw new Error('Invalid create kind.')
    }
    const abs = resolveSafeSrcFilePath(root, input.path)
    const baseName = path.basename(abs)
    if (!isValidSrcEntryName(baseName)) {
      throw new Error('Invalid name. Avoid empty values, slashes, or names like "." and "..".')
    }
    if (existsSync(abs)) {
      throw new Error('A file or folder with this name already exists.')
    }

    if (input.kind === 'directory') {
      await mkdir(abs, { recursive: false })
    } else {
      await mkdir(path.dirname(abs), { recursive: true })
      await writeFile(abs, '', { encoding: 'utf8', flag: 'wx' })
    }
    return {
      path: toPosixWorkspacePath(path.relative(root, abs)),
      kind: input.kind
    }
  })

  ipcMain.handle(ipcChannels.workspaceSrcRename, async (_event, input: { path: string; newName: string }) => {
    const root = ensureWorkspaceMounted()
    const abs = resolveSafeSrcFilePath(root, input.path)
    const srcRoot = path.resolve(root, 'src')
    if (path.resolve(abs) === srcRoot) {
      throw new Error('Cannot rename the src/ root.')
    }
    const newName = input.newName.trim()
    if (!isValidSrcEntryName(newName)) {
      throw new Error('Invalid name. Avoid empty values, slashes, or names like "." and "..".')
    }
    const nextAbs = path.join(path.dirname(abs), newName)
    if (path.resolve(nextAbs) === path.resolve(abs)) {
      // No-op rename: just return the existing path.
      return { path: toPosixWorkspacePath(path.relative(root, abs)) }
    }
    if (existsSync(nextAbs)) {
      throw new Error('A file or folder with this name already exists.')
    }
    // Re-validate that the new path stays under src/.
    const safeNext = resolveSafeSrcFilePath(root, toPosixWorkspacePath(path.relative(root, nextAbs)))
    await fsRename(abs, safeNext)
    return { path: toPosixWorkspacePath(path.relative(root, safeNext)) }
  })

  ipcMain.handle(ipcChannels.workspaceSrcDelete, async (_event, input: { path: string }) => {
    const root = ensureWorkspaceMounted()
    const abs = resolveSafeSrcFilePath(root, input.path)
    const srcRoot = path.resolve(root, 'src')
    if (path.resolve(abs) === srcRoot) {
      throw new Error('Cannot delete the src/ root.')
    }
    await rm(abs, { recursive: true, force: false })
  })

  ipcMain.handle(ipcChannels.assetsSaveImage, async (_event, input: { fileName: string; data: Uint8Array; mimeType: string }) => {
    const root = ensureWorkspaceMounted()
    return await saveAssetImage(root, input)
  })

  ipcMain.handle(ipcChannels.assetsListImages, async () => {
    const root = ensureWorkspaceMounted()
    return await listAssetImages(root)
  })

  ipcMain.handle(ipcChannels.assetsDeleteImage, async (_event, input: { path: string }) => {
    const root = ensureWorkspaceMounted()
    await deleteAssetImage(root, input.path)
  })

  ipcMain.handle(ipcChannels.windowMinimize, (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize()
  })

  ipcMain.handle(ipcChannels.windowToggleMaximize, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return false
    if (win.isMaximized()) {
      win.unmaximize()
      return false
    }
    win.maximize()
    return true
  })

  ipcMain.handle(ipcChannels.windowIsMaximized, (event) => {
    return BrowserWindow.fromWebContents(event.sender)?.isMaximized() ?? false
  })

  ipcMain.handle(ipcChannels.windowClose, (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close()
  })

}

type WorkspaceCatalog = WorkspaceCatalogEntry[]

async function gitDetect(): Promise<GitDetectResult> {
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

async function tryGetGitVersion(binary: string): Promise<string | null> {
  try {
    const res = await runProcess(binary, ['--version'])
    const match = res.trim().match(/git version\s+(.+)$/i)
    return match?.[1]?.trim() || res.trim() || 'unknown'
  } catch {
    return null
  }
}

async function runProcess(command: string, args: string[]): Promise<string> {
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

type StoredGitHubSession = {
  accessToken: string
  login: string
  createdAt: string
}

type StoredGitHubOAuthClient = {
  clientId: string
  clientSecret?: string
  updatedAt: string
}

function githubOAuthClientPath(): string {
  return path.join(app.getPath('userData'), 'github-oauth-client.json')
}

function resolveEnvClientSecret(): string | undefined {
  const secret = process.env.EMPRINT_GITHUB_CLIENT_SECRET || process.env.GITHUB_CLIENT_SECRET
  return secret?.trim() || undefined
}

function oauthClientHasSecret(stored: StoredGitHubOAuthClient | null): boolean {
  return Boolean(stored?.clientSecret?.trim() || resolveEnvClientSecret())
}

async function readGithubOAuthClient(): Promise<StoredGitHubOAuthClient | null> {
  try {
    const raw = await readFile(githubOAuthClientPath(), 'utf8')
    const parsed = JSON.parse(raw) as Partial<StoredGitHubOAuthClient>
    if (!parsed.clientId) return null
    const clientSecret =
      typeof parsed.clientSecret === 'string' && parsed.clientSecret.trim()
        ? parsed.clientSecret.trim()
        : undefined
    return {
      clientId: String(parsed.clientId),
      ...(clientSecret ? { clientSecret } : {}),
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString()
    }
  } catch {
    return null
  }
}

async function writeGithubOAuthClient(input: { clientId: string; clientSecret?: string }): Promise<void> {
  const clientSecret = input.clientSecret?.trim() || undefined
  const next: StoredGitHubOAuthClient = {
    clientId: input.clientId,
    updatedAt: new Date().toISOString(),
    ...(clientSecret ? { clientSecret } : {})
  }
  await writeFile(githubOAuthClientPath(), JSON.stringify(next, null, 2), 'utf8')
}

async function resolveGithubOAuthCredentials(): Promise<{ clientId: string; clientSecret?: string } | null> {
  await refreshCachedGithubClientId()
  const stored = await readGithubOAuthClient()
  const clientId =
    stored?.clientId || process.env.EMPRINT_GITHUB_CLIENT_ID || process.env.GITHUB_CLIENT_ID || undefined
  if (!clientId) return null
  const clientSecret = stored?.clientSecret || resolveEnvClientSecret()
  return { clientId, ...(clientSecret ? { clientSecret } : {}) }
}

async function githubOAuthClientGet(): Promise<{ clientId?: string; hasClientSecret?: boolean }> {
  const stored = await readGithubOAuthClient()
  const env = process.env.EMPRINT_GITHUB_CLIENT_ID || process.env.GITHUB_CLIENT_ID
  const clientId = stored?.clientId || env || undefined
  const hasClientSecret = oauthClientHasSecret(stored)
  return clientId ? { clientId, hasClientSecret } : { hasClientSecret }
}

async function githubOAuthClientSet(input: {
  clientId: string
  clientSecret?: string
}): Promise<{ clientId?: string; hasClientSecret?: boolean }> {
  const clientId = input.clientId.trim()
  if (!clientId) {
    throw new Error('Client ID is required.')
  }
  const existing = await readGithubOAuthClient()
  const clientSecret =
    input.clientSecret !== undefined ? input.clientSecret.trim() || undefined : existing?.clientSecret
  await writeGithubOAuthClient({ clientId, ...(clientSecret ? { clientSecret } : {}) })
  await refreshCachedGithubClientId()
  return { clientId, hasClientSecret: oauthClientHasSecret(await readGithubOAuthClient()) }
}

function githubSessionPath(): string {
  return path.join(app.getPath('userData'), 'github-session.json')
}

async function readGithubSession(): Promise<StoredGitHubSession | null> {
  try {
    const raw = await readFile(githubSessionPath(), 'utf8')
    const parsed = JSON.parse(raw) as Partial<StoredGitHubSession>
    if (!parsed.accessToken || !parsed.login) return null
    return {
      accessToken: String(parsed.accessToken),
      login: String(parsed.login),
      createdAt: typeof parsed.createdAt === 'string' ? parsed.createdAt : new Date().toISOString()
    }
  } catch {
    return null
  }
}

async function writeGithubSession(session: StoredGitHubSession): Promise<void> {
  await writeFile(githubSessionPath(), JSON.stringify(session, null, 2), 'utf8')
}

async function deleteGithubSession(): Promise<void> {
  try {
    await writeFile(githubSessionPath(), 'null', 'utf8')
  } catch {
    // ignore
  }
}

/**
 * Cached GitHub OAuth client id read from `~/.emprint/github-oauth.json`.
 * We cache it on demand because every device-code request needs it and
 * reading the file on every call is wasteful; environment variables remain a
 * dev-time fallback when the user hasn't completed the wizard yet.
 */
let cachedGithubClientId: string | undefined

async function refreshCachedGithubClientId(): Promise<void> {
  const stored = await readGithubOAuthClient()
  cachedGithubClientId = stored?.clientId
}

function ensureGithubClientId(): string {
  // Prefer user-provided (stored) client id for open-source builds.
  // Env vars remain as a development fallback.
  const clientId =
    cachedGithubClientId || process.env.EMPRINT_GITHUB_CLIENT_ID || process.env.GITHUB_CLIENT_ID
  if (!clientId) {
    throw new Error('GitHub OAuth Client ID is missing. Please set it in the app (Wizard) first.')
  }
  return clientId
}

async function githubAuthStatus(): Promise<GitHubAuthStatus> {
  const session = await readGithubSession()
  return session ? { connected: true, login: session.login } : { connected: false }
}

async function githubAuthStart(input: { scopes: string[] }): Promise<GitHubDeviceCode> {
  await refreshCachedGithubClientId()
  const clientId = ensureGithubClientId()
  const scopes = Array.isArray(input.scopes) ? input.scopes : []

  const body = new URLSearchParams()
  body.set('client_id', clientId)
  if (scopes.length > 0) {
    body.set('scope', scopes.join(' '))
  }

  const res = await fetch('https://github.com/login/device/code', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body
  })

  if (!res.ok) {
    const message = await safeReadText(res)
    throw new Error(`GitHub device code request failed (${res.status}): ${message}`)
  }

  const json = (await res.json()) as {
    device_code?: string
    user_code?: string
    verification_uri?: string
    expires_in?: number
    interval?: number
  }

  if (!json.device_code || !json.user_code || !json.verification_uri) {
    throw new Error('Invalid GitHub device code response.')
  }

  return {
    deviceCode: json.device_code,
    userCode: json.user_code,
    verificationUri: json.verification_uri,
    expiresIn: Number(json.expires_in ?? 900),
    interval: Number(json.interval ?? 5)
  }
}

async function githubAuthPoll(input: { deviceCode: string }): Promise<GitHubAuthStatus> {
  await refreshCachedGithubClientId()
  const clientId = ensureGithubClientId()
  const deviceCode = input.deviceCode

  const body = new URLSearchParams()
  body.set('client_id', clientId)
  body.set('device_code', deviceCode)
  body.set('grant_type', 'urn:ietf:params:oauth:grant-type:device_code')

  const res = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body
  })

  if (!res.ok) {
    const message = await safeReadText(res)
    throw new Error(`GitHub token polling failed (${res.status}): ${message}`)
  }

  const json = (await res.json()) as {
    access_token?: string
    token_type?: string
    scope?: string
    error?: string
    error_description?: string
  }

  if (json.error) {
    if (json.error === 'authorization_pending') {
      return { connected: false }
    }
    if (json.error === 'slow_down') {
      const detail = json.error_description ? ` (${json.error_description})` : ''
      throw new Error(`GitHub auth error: slow_down${detail}`)
    }
    if (json.error === 'expired_token') {
      throw new Error('GitHub device code expired. Please restart sign-in.')
    }
    const detail = json.error_description ? ` (${json.error_description})` : ''
    throw new Error(`GitHub auth error: ${json.error}${detail}`)
  }

  if (!json.access_token) {
    // If GitHub returns an unexpected shape, surface it instead of silently waiting forever.
    throw new Error(`Unexpected GitHub token response: ${JSON.stringify(json)}`)
  }

  const token = json.access_token
  const viewer = await githubApiGet('https://api.github.com/user', token)
  const login = typeof viewer.login === 'string' ? viewer.login : ''
  if (!login) {
    throw new Error('Failed to verify GitHub user profile.')
  }

  await writeGithubSession({
    accessToken: token,
    login,
    createdAt: new Date().toISOString()
  })

  return { connected: true, login }
}

async function revokeGithubAccessToken(accessToken: string): Promise<void> {
  const creds = await resolveGithubOAuthCredentials()
  if (!creds?.clientId) {
    console.warn('[emprint] Skipping GitHub token revoke: OAuth Client ID is not configured.')
    return
  }

  const { clientId, clientSecret } = creds
  if (!clientSecret) {
    console.warn(
      '[emprint] Skipping GitHub token revoke: Client Secret is not set. Add it in Settings (or EMPRINT_GITHUB_CLIENT_SECRET) so logout invalidates the token on GitHub.'
    )
    return
  }

  const revokeBody = new URLSearchParams()
  revokeBody.set('client_id', clientId)
  revokeBody.set('client_secret', clientSecret)
  revokeBody.set('token', accessToken)

  const revokeRes = await fetch('https://github.com/login/oauth/revoke', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: revokeBody
  })

  if (revokeRes.ok) return

  const basic = Buffer.from(`${clientId}:${clientSecret}`, 'utf8').toString('base64')
  const deleteRes = await fetch(`https://api.github.com/applications/${encodeURIComponent(clientId)}/token`, {
    method: 'DELETE',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28'
    },
    body: JSON.stringify({ access_token: accessToken })
  })

  if (deleteRes.ok || deleteRes.status === 404) return

  const message = await safeReadText(deleteRes)
  console.warn(`[emprint] GitHub token revoke failed (${deleteRes.status}): ${message}`)
}

async function githubLogout(): Promise<void> {
  const session = await readGithubSession()
  if (session?.accessToken) {
    try {
      await revokeGithubAccessToken(session.accessToken)
    } catch (caught) {
      console.warn('[emprint] GitHub token revoke error:', caught)
    }
  }
  await deleteGithubSession()
}

let githubLogoutPromise: Promise<void> | null = null

/** Revoke remote token (when possible) and clear local GitHub session. Idempotent. */
export async function performGithubLogout(): Promise<void> {
  if (!githubLogoutPromise) {
    githubLogoutPromise = githubLogout().finally(() => {
      githubLogoutPromise = null
    })
  }
  return githubLogoutPromise
}

let appCloseGuardRegistered = false
let skipAppCloseGuard = false
let closeGuardInProgress = false
let closeGuardMainWindow: BrowserWindow | null = null

function notifyRendererGithubSessionCleared(win: BrowserWindow | null): void {
  if (!win || win.isDestroyed()) return
  win.webContents.send(ipcChannels.githubSessionCleared)
}

/** Native dialog so quit/close works in dev (renderer may tear down before React can paint). */
async function runCloseGuardDialog(kind: 'window' | 'app', login?: string): Promise<'logout' | 'continue' | 'cancel'> {
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

async function handleCloseAttempt(kind: 'window' | 'app'): Promise<void> {
  if (skipAppCloseGuard) {
    if (kind === 'app') app.exit(0)
    else closeGuardMainWindow?.close()
    return
  }

  if (closeGuardInProgress) return
  closeGuardInProgress = true

  try {
    const status = await githubAuthStatus()
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

async function githubRepoCreate(input: GitHubRepoCreateInput): Promise<GitHubRepoCreateResult> {
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
async function tryEnableGitHubPagesViaActions(owner: string, repo: string, token: string): Promise<void> {
  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pages`
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

    console.warn(`[emprint] Could not auto-enable GitHub Pages for ${owner}/${repo} (${res.status}): ${text}`)
  } catch (err) {
    console.warn(`[emprint] Could not auto-enable GitHub Pages for ${owner}/${repo}:`, err)
  }
}

async function githubRepoDeleteRemote(owner: string, repo: string): Promise<void> {
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

async function githubRepoCreateWithFallback(input: {
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

async function githubApiPostRaw(url: string, token: string, body: unknown): Promise<{ ok: boolean; status: number; text: string; json: any }> {
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

function githubApiErrorFromResponse(status: number, text: string): Error {
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

async function githubApiGet(url: string, token: string): Promise<any> {
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'Emprint'
    }
  })
  if (!res.ok) {
    throw new Error(`GitHub API failed (${res.status}).`)
  }
  return await res.json()
}

async function githubApiPost(url: string, token: string, body: unknown): Promise<any> {
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
  if (!res.ok) {
    const text = await safeReadText(res)
    const maybeJson = safeJsonParse(text)

    if (res.status === 422 && maybeJson && typeof maybeJson === 'object') {
      const message = typeof (maybeJson as any).message === 'string' ? String((maybeJson as any).message) : ''
      const errors = Array.isArray((maybeJson as any).errors) ? ((maybeJson as any).errors as any[]) : []
      const nameConflict = errors.some((err) => err?.field === 'name' && String(err?.message || '').includes('already exists'))
      if (nameConflict) {
        throw new Error('Repository name already exists for this owner. Please choose a different name.')
      }
      throw new Error(message ? `GitHub API failed (${res.status}): ${message}` : `GitHub API failed (${res.status}): ${text}`)
    }

    throw new Error(`GitHub API failed (${res.status}): ${text}`)
  }
  return await res.json()
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

async function safeReadText(res: Response): Promise<string> {
  try {
    return await res.text()
  } catch {
    return ''
  }
}

/** Match GitHub / network blips that often succeed on retry (initial push only). */
const TRANSIENT_GIT_REMOTE_ERR = /HTTP\s+50[02348]|RPC failed|unexpected disconnect|hung up unexpectedly|timed out|ECONNRESET|ETIMEDOUT/i

async function runGitRawWithRetry(git: ReturnType<typeof simpleGit>, args: string[], attempts = 3): Promise<void> {
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
async function ensureGitAuthorIdentity(
  git: ReturnType<typeof simpleGit>,
  session: StoredGitHubSession | null
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

async function gitInitialSync(input: { directory: string; remoteUrl?: string; branch?: string }): Promise<GitInitialSyncResult> {
  const directory = path.resolve(input.directory)
  const branch = input.branch?.trim() || 'main'
  const remoteUrl = input.remoteUrl?.trim()

  const git = simpleGit(directory)

  // Guarantee an author identity before the first commit so non-developer
  // machines (no global git config) don't fail silently. Uses the stored
  // GitHub session when available so commits attribute correctly.
  const session = await readGithubSession()
  await ensureGitAuthorIdentity(git, session)

  // Stage + commit if possible (ignore if nothing to commit).
  let committed = false
  try {
    await git.add('.')
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

  const authUrl = buildGithubAuthRemoteUrl(remoteUrl, session.accessToken)
  await runGitRawWithRetry(git, ['push', '-u', authUrl, branch])
  return { committed, pushed: true, branch }
}

function countPendingFiles(status: Awaited<ReturnType<ReturnType<typeof simpleGit>['status']>>): number {
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

function mapPendingFiles(status: Awaited<ReturnType<ReturnType<typeof simpleGit>['status']>>): GitWorkingTreeSummary['pendingFiles'] {
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
  return pending
}

async function resolveOriginPlainUrl(git: ReturnType<typeof simpleGit>): Promise<string | undefined> {
  try {
    const remotes = await git.getRemotes(true)
    const origin = remotes.find((r) => r.name === 'origin') ?? remotes[0]
    return origin?.refs.fetch || origin?.refs.push
  } catch {
    return undefined
  }
}

async function withAuthenticatedOrigin<T>(
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

async function ensurePublishBranch(git: ReturnType<typeof simpleGit>): Promise<{
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

async function gitFetchOriginMain(git: ReturnType<typeof simpleGit>): Promise<void> {
  const plainUrl = await resolveOriginPlainUrl(git)
  if (!plainUrl) return
  const session = await readGithubSession()
  if (!session) return
  await withAuthenticatedOrigin(git, async () => {
    await runGitRawWithRetry(git, ['fetch', 'origin', EMPRINT_PUBLISH_BRANCH, '--prune'])
  })
}

async function countRevList(git: ReturnType<typeof simpleGit>, fromRef: string, toRef: string): Promise<number> {
  try {
    const raw = (await git.raw(['rev-list', '--count', `${fromRef}..${toRef}`])).trim()
    const n = Number.parseInt(raw, 10)
    return Number.isFinite(n) && n >= 0 ? n : 0
  } catch {
    return 0
  }
}

/** Compare HEAD to `origin/<publishBranch>` so behind/ahead work without upstream tracking. */
async function resolveAheadBehind(git: ReturnType<typeof simpleGit>): Promise<{ ahead: number; behind: number }> {
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

async function ensureUpstreamTracksOriginMain(git: ReturnType<typeof simpleGit>, branch: string): Promise<void> {
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

function sendRecoverProgress(sender: WebContents, payload: GitRecoverWorkspaceProgress): void {
  if (sender.isDestroyed()) return
  sender.send(ipcChannels.gitRecoverWorkspaceProgress, payload)
}

async function gitRecoverWorkspace(sender: WebContents, input: GitRecoverWorkspaceInput): Promise<GitRecoverWorkspaceResult> {
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

  if (mountedWorkspaceRoot && path.resolve(mountedWorkspaceRoot) === localDirectory) {
    mountedWorkspaceRoot = null
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
async function gitWorkingTree(directory: string): Promise<GitWorkingTreeSummary> {
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

  const status = await git.status()
  const pendingFiles = mapPendingFiles(status)
  const hasConflicts = status.conflicted.length > 0
  const session = await readGithubSession()
  const branch = status.current ?? branchInfo.branch
  const offPublishBranch = branch !== EMPRINT_PUBLISH_BRANCH
  const { ahead, behind } = await resolveAheadBehind(git)

  if (hasRemote && branch === EMPRINT_PUBLISH_BRANCH) {
    await ensureUpstreamTracksOriginMain(git, branch)
  }

  const diverged = ahead > 0 && behind > 0
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

async function gitPull(directory: string, input?: GitPullInput): Promise<GitPullResult> {
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
async function gitPublish(directory: string, input: GitPublishInput): Promise<GitPublishResult> {
  const message = (input.message ?? '').trim()
  if (!message) {
    throw new Error('Commit message is required.')
  }
  const wantPush = input.push !== false
  const git = simpleGit(directory)

  const preStatus = await git.status()
  const hasPendingChanges =
    preStatus.staged.length +
      preStatus.created.length +
      preStatus.modified.length +
      preStatus.deleted.length +
      preStatus.renamed.length +
      preStatus.not_added.length +
      preStatus.conflicted.length >
    0

  let committed = false
  let commitSha: string | undefined
  if (hasPendingChanges) {
    // Set author identity at local scope if missing, otherwise commit throws on
    // machines with no global git config. See `ensureGitAuthorIdentity` for the
    // privacy-preserving GitHub `noreply` defaults.
    const session = await readGithubSession()
    await ensureGitAuthorIdentity(git, session)

    await git.add(['-A', '.'])
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
function parseGitLogOutput(raw: string): GitCommitNode[] {
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

async function gitLog(directory: string, input: GitLogInput): Promise<GitCommitNode[]> {
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
async function ensureGitignoreLine(workspaceRoot: string, rawLine: string): Promise<void> {
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
const ALWAYS_IGNORED_PATHS = ['drafts/']

async function ensureEmprintGitignore(workspaceRoot: string): Promise<void> {
  for (const line of ALWAYS_IGNORED_PATHS) {
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
async function untrackEmprintIgnoredPaths(workspaceRoot: string): Promise<void> {
  let git: ReturnType<typeof simpleGit>
  try {
    git = simpleGit(workspaceRoot)
    const isRepo = await git.checkIsRepo()
    if (!isRepo) return
  } catch {
    return
  }

  for (const candidate of ALWAYS_IGNORED_PATHS) {
    const normalized = candidate.replace(/\/+$/, '')
    try {
      // `--cached` removes from the index only, leaving the working tree
      // untouched. `--ignore-unmatch` keeps git from erroring out when the
      // path is already untracked. `-r` is needed because we pass a folder.
      await git.raw(['rm', '-r', '--cached', '--ignore-unmatch', normalized])
    } catch {
      // ignored on purpose — see function-level comment
    }
  }
}

function buildGithubAuthRemoteUrl(remoteUrl: string, token: string): string {
  const parsed = new URL(remoteUrl)
  if (parsed.protocol !== 'https:' || parsed.hostname !== 'github.com') {
    throw new Error('Only https://github.com remotes are supported for authenticated push in this MVP.')
  }
  const safeToken = encodeURIComponent(token)
  parsed.username = 'x-access-token'
  parsed.password = safeToken
  return parsed.toString()
}

function catalogPath(): string {
  return path.join(app.getPath('userData'), 'catalog.json')
}

/** Removes the workspace directory tree. Skips missing paths; refuses a few protected roots. */
async function removeWorkspaceFromDisk(localDirectory: string): Promise<void> {
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

async function readCatalog(): Promise<WorkspaceCatalog> {
  try {
    const raw = await readFile(catalogPath(), 'utf8')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as WorkspaceCatalog) : []
  } catch {
    return []
  }
}

async function writeCatalog(catalog: WorkspaceCatalog): Promise<void> {
  await writeFile(catalogPath(), JSON.stringify(catalog, null, 2), 'utf8')
}

function upsertCatalogEntry(catalog: WorkspaceCatalog, entry: WorkspaceCatalogEntry): WorkspaceCatalog {
  const next = catalog.filter((existing) => existing.id !== entry.id)
  next.unshift(entry)
  return next
}

function toPosixWorkspacePath(filePath: string): string {
  return filePath.split(path.sep).join('/')
}

function isValidSrcEntryName(name: string): boolean {
  if (!name || name === '.' || name === '..') return false
  // POSIX-style separator and Windows-style drive/sep characters.
  if (/[\\/]/.test(name)) return false
  // Disallow names that are pure whitespace.
  if (!name.trim()) return false
  return true
}

function resolveSafePostsOrDraftsPath(workspaceRoot: string, inputPath: string): string {
  const normalized = inputPath.replace(/\\/g, '/').replace(/^\/+/, '')
  if (!normalized || hasPathTraversalSegment(normalized)) {
    throw new Error('Invalid path.')
  }
  if (!normalized.startsWith('posts/') && !normalized.startsWith('drafts/')) {
    throw new Error('Path must be under posts/ or drafts/.')
  }
  const abs = path.resolve(workspaceRoot, ...normalized.split('/'))
  const postsRoot = path.resolve(workspaceRoot, WORKSPACE_DIR.posts)
  const draftsRoot = path.resolve(workspaceRoot, WORKSPACE_DIR.drafts)
  const inPosts = !path.relative(postsRoot, abs).startsWith('..') && !path.isAbsolute(path.relative(postsRoot, abs))
  const inDrafts = !path.relative(draftsRoot, abs).startsWith('..') && !path.isAbsolute(path.relative(draftsRoot, abs))
  if (!inPosts && !inDrafts) {
    throw new Error('Path escapes posts/ and drafts/.')
  }
  return abs
}

function resolveSafeSrcFilePath(workspaceRoot: string, inputPath: string): string {
  const normalized = inputPath.replace(/\\/g, '/').replace(/^\/+/, '')
  if (!normalized || hasPathTraversalSegment(normalized)) {
    throw new Error('Invalid path.')
  }
  if (normalized !== 'src' && !normalized.startsWith('src/')) {
    throw new Error('Path must be under src/.')
  }
  const abs = path.resolve(workspaceRoot, ...normalized.split('/'))
  const srcRoot = path.resolve(workspaceRoot, 'src')
  const rel = path.relative(srcRoot, abs)
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error('Path escapes src/.')
  }
  return abs
}

async function buildSrcTreeNode(absPath: string, relativePath: string): Promise<WorkspaceSrcTreeNode> {
  const name = path.basename(absPath)
  const posixRel = relativePath.replace(/\\/g, '/')
  const st = await stat(absPath)
  if (!st.isDirectory()) {
    return { name, path: posixRel, kind: 'file' }
  }

  const dirents = await readdir(absPath, { withFileTypes: true })
  const children: WorkspaceSrcTreeNode[] = []
  for (const ent of dirents) {
    if (ent.name === 'node_modules' || ent.name === '.git') continue
    const childRel = `${posixRel}/${ent.name}`
    const childAbs = path.join(absPath, ent.name)
    children.push(await buildSrcTreeNode(childAbs, childRel))
  }
  children.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1
    return a.name.localeCompare(b.name)
  })
  return { name, path: posixRel, kind: 'directory', children }
}

async function listWorkspaceSrcTree(workspaceRoot: string): Promise<WorkspaceSrcTreeNode | null> {
  const srcRoot = path.join(workspaceRoot, 'src')
  if (!existsSync(srcRoot)) {
    return { name: 'src', path: 'src', kind: 'directory', children: [] }
  }
  return await buildSrcTreeNode(srcRoot, 'src')
}

function ensureWorkspaceMounted(): string {
  if (!mountedWorkspaceRoot) {
    throw new Error('Workspace is not mounted yet.')
  }
  return mountedWorkspaceRoot
}

async function safeListDirectory(directory: string): Promise<string[]> {
  try {
    return await readdir(directory)
  } catch {
    return []
  }
}

function summarizeMarkdown(relativePath: string, content: string, fallbackUpdatedAt: string): PostSummary {
  let data: Record<string, unknown> = {}
  try {
    const parsed = matter(content)
    data = parsed.data as Record<string, unknown>
  } catch {
    data = {}
  }

  const title = typeof data.title === 'string' && data.title.trim()
    ? data.title.trim()
    : inferTitleFromPath(relativePath)

  const description = typeof data.description === 'string' ? data.description : ''
  const tags = Array.isArray(data.tags) ? data.tags.map(String) : []
  const draft = Boolean(data.draft)
  const createdAt = typeof data.createdAt === 'string' ? data.createdAt : ''
  const updatedAt = typeof data.updatedAt === 'string' ? data.updatedAt : fallbackUpdatedAt

  return {
    path: relativePath,
    title,
    description,
    tags,
    draft,
    createdAt,
    updatedAt
  }
}

function inferTitleFromPath(relativePath: string): string {
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

function slugifyAssetBaseName(fileName: string): string {
  const withoutExt = fileName.replace(/\.[a-z0-9]+$/i, '')
  const slug = withoutExt
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
  return slug || 'image'
}

function buildUniqueAssetPath(imagesDir: string, baseName: string, ext: string): string {
  let candidate = path.join(imagesDir, `${baseName}.${ext}`)
  let counter = 2
  while (existsSync(candidate)) {
    candidate = path.join(imagesDir, `${baseName}-${counter}.${ext}`)
    counter++
  }
  return candidate
}

async function saveAssetImage(
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
    references: []
  }
}

function resolveSafeAssetPath(workspaceRoot: string, inputPath: string): string {
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

async function deleteAssetImage(workspaceRoot: string, relativePath: string): Promise<void> {
  const abs = resolveSafeAssetPath(workspaceRoot, relativePath)
  const st = await stat(abs)
  if (!st.isFile()) {
    throw new Error('Not a file.')
  }
  await unlink(abs)
}

function mimeTypeForExtension(ext: string): string {
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

function normalizeReferenceTarget(reference: string): string | null {
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

async function listAssetImages(workspaceRoot: string): Promise<AssetImageInfo[]> {
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
      references: []
    })
  }

  // Build lookup keys for each image so we can match many path variants.
  const imageByKey = new Map<string, AssetImageInfo>()
  for (const img of images) {
    imageByKey.set(img.path, img) // assets/images/foo.jpg
    imageByKey.set(img.name, img) // foo.jpg
  }

  // Scan posts/ and drafts/ for references.
  const sections: Array<{ section: 'posts' | 'drafts'; dir: string }> = [
    { section: 'posts', dir: path.join(workspaceRoot, WORKSPACE_DIR.posts) },
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
      const summary = summarizeMarkdown(postRelPath, content, '')
      for (const ref of extractMarkdownImageRefs(content)) {
        const target = normalizeReferenceTarget(ref)
        if (!target) continue
        const hit = imageByKey.get(target) ?? imageByKey.get(target.split('/').pop()!)
        if (!hit) continue
        // De-duplicate per post.
        if (hit.references.some((r) => r.postPath === postRelPath)) continue
        const reference: AssetReference = {
          postPath: postRelPath,
          postTitle: summary.title,
          section
        }
        hit.references.push(reference)
      }
    }
  }

  images.sort((a, b) => (a.modifiedAt < b.modifiedAt ? 1 : -1))
  return images
}
