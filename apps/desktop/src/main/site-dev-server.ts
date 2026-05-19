import { existsSync, readFileSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { execFile, spawn, type ChildProcess } from 'node:child_process'
import { promisify } from 'node:util'
import { shell } from 'electron'
import type { SiteDevServerPhase, SiteDevServerState, SiteDevServerStatus } from '@emprint/shared'
import { resolveWindowsSystemExecutable, spawnNode, spawnNpm } from './resolve-node-toolchain'
import { ensureWorkspaceSyncThemeScript } from './workspace-theme-script'

export const SITE_DEV_PREVIEW_URL = 'http://localhost:4321/'
const DEFAULT_PREVIEW_PORT = 4321

const execFileAsync = promisify(execFile)

let child: ChildProcess | null = null
let currentPreviewUrl = SITE_DEV_PREVIEW_URL
let workspaceRoot: string | null = null
let status: SiteDevServerStatus = 'stopped'
let phase: SiteDevServerPhase = 'idle'
let statusMessage: string | undefined
let progress: number | undefined
let startPromise: Promise<SiteDevServerState> | null = null
let lastDevStderr = ''

function snapshot(): SiteDevServerState {
  return {
    status,
    url: currentPreviewUrl,
    phase,
    ...(statusMessage ? { message: statusMessage } : {}),
    ...(typeof progress === 'number' ? { progress } : {})
  }
}

function bumpInstallProgress(delta = 3) {
  if (phase !== 'installing') return
  progress = Math.min(88, (progress ?? 8) + delta)
}

function spawnNpmInstall(cwd: string, onOutput?: () => void): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const proc = spawnNpm(['install', '--no-fund', '--no-audit'], {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe']
    })
    let err = ''
    const onData = () => {
      onOutput?.()
    }
    proc.stdout?.on('data', onData)
    proc.stderr?.on('data', (chunk) => {
      onData()
      err += String(chunk)
    })
    proc.on('error', reject)
    proc.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(err.trim() || `npm install failed (${code})`))
      }
    })
  })
}

async function runNpmInstall(cwd: string): Promise<void> {
  phase = 'installing'
  status = 'starting'
  progress = 8
  statusMessage = undefined

  await spawnNpmInstall(cwd, () => {
    bumpInstallProgress(2)
  })
  progress = 92
}

/** Install anthology site dependencies without starting the dev server. */
export async function installSiteDependencies(root: string): Promise<void> {
  const resolved = path.resolve(root)
  if (!existsSync(path.join(resolved, 'package.json'))) {
    throw new Error('package.json was not found in this anthology.')
  }
  await spawnNpmInstall(resolved)
}

function devStartFailureMessage(): string {
  const tail = lastDevStderr.trim()
  if (tail) {
    const lines = tail.split('\n').filter(Boolean)
    const snippet = lines.slice(-6).join('\n')
    return `Dev server failed to start.\n${snippet}`
  }
  if (statusMessage) return statusMessage
  return 'Dev server failed to start.'
}

const PREVIEW_PORT_RANGE = [4321, 4322, 4323, 4324, 4325] as const

function capturePreviewUrlFromDevLog(chunk: string): void {
  const localMatch = chunk.match(/Local\s+(https?:\/\/(?:localhost|127\.0\.0\.1):\d+\/?)/i)
  if (localMatch?.[1]) {
    const raw = localMatch[1]
    currentPreviewUrl = raw.endsWith('/') ? raw : `${raw}/`
    return
  }
  const all = [...chunk.matchAll(/https?:\/\/(?:localhost|127\.0\.0\.1):\d+\/?/gi)]
  const last = all.at(-1)?.[0]
  if (!last) return
  currentPreviewUrl = last.endsWith('/') ? last : `${last}/`
}

/** Stop stray Astro/Vite listeners Emprint does not own (common when preview was left running). */
async function releasePreviewPorts(ports: readonly number[] = PREVIEW_PORT_RANGE): Promise<void> {
  const ourPid = child?.pid

  if (process.platform === 'win32') {
    try {
      const { stdout } = await execFileAsync(resolveWindowsSystemExecutable('netstat'), ['-ano'], {
        encoding: 'utf8',
        windowsHide: true
      })
      for (const port of ports) {
        const lines = stdout.split('\n').filter((line) => line.includes(`:${port}`) && line.includes('LISTENING'))
        for (const line of lines) {
          const pid = Number.parseInt(line.trim().split(/\s+/).pop() ?? '', 10)
          if (pid > 0 && pid !== ourPid) {
            try {
              await execFileAsync(resolveWindowsSystemExecutable('taskkill'), [
                '/PID',
                String(pid),
                '/F',
                '/T'
              ], { windowsHide: true })
            } catch {
              /* ignore */
            }
          }
        }
      }
    } catch {
      /* ports likely free */
    }
    await new Promise((r) => setTimeout(r, 400))
    return
  }

  for (const port of ports) {
    try {
      const { stdout } = await execFileAsync('lsof', ['-ti', `:${port}`], { encoding: 'utf8' })
      for (const token of stdout.trim().split(/\s+/)) {
        const pid = Number.parseInt(token, 10)
        if (pid > 0 && pid !== ourPid) {
          try {
            process.kill(pid, 'SIGKILL')
          } catch {
            /* ignore */
          }
        }
      }
    } catch {
      /* port free */
    }
  }
  await new Promise((r) => setTimeout(r, 500))
}

async function waitForHttpReady(getUrl: () => string, timeoutMs = 120_000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (status === 'stopped') {
      throw new Error(devStartFailureMessage())
    }
    if (status === 'error') {
      throw new Error(devStartFailureMessage())
    }
    progress = Math.min(98, (progress ?? 93) + 1)
    const url = getUrl()
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2_500) })
      if (res.ok || res.status < 500) return
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 600))
  }
  throw new Error(
    `Timed out waiting for the Astro dev server (${getUrl()}). If another app uses port ${DEFAULT_PREVIEW_PORT}, quit it and try again.`
  )
}

function attachChildLogging(proc: ChildProcess): void {
  lastDevStderr = ''
  const onChunk = (chunk: Buffer | string) => {
    const text = String(chunk)
    capturePreviewUrlFromDevLog(text)
    lastDevStderr = appendDevLog(lastDevStderr, text)
  }
  proc.stdout?.on('data', onChunk)
  proc.stderr?.on('data', onChunk)
  proc.on('exit', (code, signal) => {
    if (child === proc) {
      child = null
      workspaceRoot = null
      if (status !== 'stopped') {
        status = 'error'
        phase = 'idle'
        progress = undefined
        const tail = lastDevStderr.trim()
        statusMessage =
          tail ||
          (code != null
            ? `Dev server exited (code ${code}).`
            : signal
              ? `Dev server exited (${signal}).`
              : 'Dev server exited.')
      }
    }
  })
}

function appendDevLog(prev: string, chunk: Buffer | string): string {
  const next = prev + String(chunk)
  return next.length > 12_000 ? next.slice(-12_000) : next
}

function killChildTree(proc: ChildProcess): Promise<void> {
  return new Promise((resolve) => {
    if (proc.killed) {
      resolve()
      return
    }
    proc.once('exit', () => resolve())
    if (process.platform === 'win32') {
      try {
        spawn(resolveWindowsSystemExecutable('taskkill'), ['/pid', String(proc.pid), '/f', '/t'], {
          shell: false,
          stdio: 'ignore',
          windowsHide: true
        })
      } catch {
        proc.kill()
      }
    } else {
      proc.kill('SIGTERM')
      setTimeout(() => {
        if (!proc.killed) proc.kill('SIGKILL')
      }, 2_000)
    }
    setTimeout(resolve, 2_500)
  })
}

export function getSiteDevServerState(): SiteDevServerState {
  return snapshot()
}

export async function stopSiteDevServer(): Promise<SiteDevServerState> {
  startPromise = null
  currentPreviewUrl = SITE_DEV_PREVIEW_URL
  status = 'stopped'
  phase = 'idle'
  progress = undefined
  statusMessage = undefined
  const proc = child
  child = null
  workspaceRoot = null
  if (proc) {
    await killChildTree(proc)
  }
  await releasePreviewPorts()
  return snapshot()
}

const WORKSPACE_PREDEV =
  'node ./scripts/sync-theme.mjs && node ./scripts/sync-assets.mjs'

/** Avoid nested `npm run` in lifecycle scripts (cmd.exe breaks on `C:\Program Files\...`). */
async function ensureWorkspaceNpmScripts(root: string): Promise<void> {
  const pkgPath = path.join(root, 'package.json')
  if (!existsSync(pkgPath)) return

  const raw = await readFile(pkgPath, 'utf8')
  const pkg = JSON.parse(raw) as { scripts?: Record<string, string> }
  const scripts = { ...(pkg.scripts ?? {}) }

  const predevUsesNpmRun =
    scripts.predev?.includes('npm run sync:theme') || scripts.predev?.includes('npm run sync:assets')
  const prebuildUsesNpmRun =
    scripts.prebuild?.includes('npm run sync:theme') ||
    scripts.prebuild?.includes('npm run sync:assets')
  const predevOnlyTheme =
    scripts.predev === 'node ./scripts/sync-theme.mjs' ||
    scripts.predev?.trim() === 'node ./scripts/sync-theme.mjs'

  if (!predevUsesNpmRun && !prebuildUsesNpmRun && !predevOnlyTheme) {
    return
  }

  scripts['sync:theme'] = scripts['sync:theme'] ?? 'node ./scripts/sync-theme.mjs'
  scripts['sync:assets'] = scripts['sync:assets'] ?? 'node ./scripts/sync-assets.mjs'
  if (predevUsesNpmRun || predevOnlyTheme) {
    scripts.predev = WORKSPACE_PREDEV
  }
  if (prebuildUsesNpmRun) {
    scripts.prebuild = WORKSPACE_PREDEV
  }
  scripts['theme:sync'] = scripts['theme:sync'] ?? 'npm run sync:theme'

  await writeFile(pkgPath, `${JSON.stringify({ ...pkg, scripts }, null, 2)}\n`, 'utf8')
}

function runNodeScript(scriptPath: string, cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawnNode([scriptPath], {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { BROWSER: 'none', CI: 'true' }
    })
    let err = ''
    proc.stderr?.on('data', (chunk) => {
      err += String(chunk)
    })
    proc.on('error', reject)
    proc.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(err.trim() || `${path.basename(scriptPath)} failed (${code})`))
      }
    })
  })
}

async function runWorkspacePredev(root: string): Promise<void> {
  const themeScript = path.join(root, 'scripts', 'sync-theme.mjs')
  const assetsScript = path.join(root, 'scripts', 'sync-assets.mjs')
  if (existsSync(themeScript)) {
    await runNodeScript(themeScript, root)
  }
  if (existsSync(assetsScript)) {
    await runNodeScript(assetsScript, root)
  }
}

/** Astro 6+ ships CLI at `bin/astro.mjs` (not legacy `astro.js`). */
function resolveAstroCli(root: string): string | null {
  const astroDir = path.join(root, 'node_modules', 'astro')
  const pkgPath = path.join(astroDir, 'package.json')
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as {
        bin?: string | Record<string, string>
      }
      const binRel =
        typeof pkg.bin === 'string'
          ? pkg.bin
          : pkg.bin && typeof pkg.bin === 'object'
            ? pkg.bin.astro
            : undefined
      if (binRel) {
        const cli = path.join(astroDir, binRel)
        if (existsSync(cli)) return cli
      }
    } catch {
      /* fall through to known paths */
    }
  }
  for (const rel of ['bin/astro.mjs', 'astro.js']) {
    const candidate = path.join(astroDir, rel)
    if (existsSync(candidate)) return candidate
  }
  return null
}

async function ensureDependencies(root: string): Promise<void> {
  if (resolveAstroCli(root)) return
  await runNpmInstall(root)
}

async function startSiteDevServer(root: string): Promise<SiteDevServerState> {
  const resolved = path.resolve(root)
  if (!existsSync(path.join(resolved, 'package.json'))) {
    status = 'error'
    phase = 'idle'
    progress = undefined
    statusMessage = 'package.json was not found in this anthology.'
    return snapshot()
  }

  if (child && workspaceRoot === resolved && status === 'running') {
    return snapshot()
  }

  if (child) {
    await stopSiteDevServer()
  }

  workspaceRoot = resolved
  status = 'starting'
  phase = 'starting-dev'
  progress = resolveAstroCli(resolved) ? 90 : undefined
  statusMessage = undefined

  await ensureWorkspaceNpmScripts(resolved)
  await ensureDependencies(resolved)
  await ensureWorkspaceSyncThemeScript(resolved)

  currentPreviewUrl = SITE_DEV_PREVIEW_URL
  await releasePreviewPorts()

  phase = 'starting-dev'
  progress = 94
  statusMessage = undefined

  await runWorkspacePredev(resolved)

  const astroCli = resolveAstroCli(resolved)
  if (!astroCli) {
    status = 'error'
    phase = 'idle'
    progress = undefined
    statusMessage = 'Astro is not installed in this anthology. Try saving the workspace again or run npm install.'
    return snapshot()
  }

  const proc = spawnNode([astroCli, 'dev'], {
    cwd: resolved,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { BROWSER: 'none', CI: 'true' }
  })

  child = proc
  attachChildLogging(proc)

  proc.on('error', (err) => {
    if (child === proc) {
      status = 'error'
      phase = 'idle'
      progress = undefined
      statusMessage = err.message
      child = null
      workspaceRoot = null
    }
  })

  await waitForHttpReady(() => currentPreviewUrl)
  if (child !== proc) {
    throw new Error(devStartFailureMessage())
  }

  status = 'running'
  phase = 'idle'
  progress = 100
  statusMessage = undefined
  return snapshot()
}

export async function startSiteDevServerForWorkspace(root: string): Promise<SiteDevServerState> {
  if (startPromise) return startPromise
  startPromise = startSiteDevServer(root).finally(() => {
    startPromise = null
  })
  return startPromise
}

export async function openSiteDevPreview(root: string): Promise<SiteDevServerState> {
  phase = 'opening-browser'
  progress = 99
  statusMessage = undefined
  const state = await startSiteDevServerForWorkspace(root)
  if (state.status === 'running') {
    await shell.openExternal(state.url || SITE_DEV_PREVIEW_URL)
  }
  phase = 'idle'
  progress = undefined
  statusMessage = undefined
  return state.status === 'running' ? { ...state, progress: 100 } : state
}
