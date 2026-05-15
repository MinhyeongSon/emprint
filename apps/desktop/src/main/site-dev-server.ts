import { existsSync } from 'node:fs'
import path from 'node:path'
import { spawn, type ChildProcess } from 'node:child_process'
import { shell } from 'electron'
import type { SiteDevServerPhase, SiteDevServerState, SiteDevServerStatus } from '@emprint/shared'

export const SITE_DEV_PREVIEW_URL = 'http://localhost:4321/'

let child: ChildProcess | null = null
let workspaceRoot: string | null = null
let status: SiteDevServerStatus = 'stopped'
let phase: SiteDevServerPhase = 'idle'
let statusMessage: string | undefined
let progress: number | undefined
let startPromise: Promise<SiteDevServerState> | null = null

function snapshot(): SiteDevServerState {
  return {
    status,
    url: SITE_DEV_PREVIEW_URL,
    phase,
    ...(statusMessage ? { message: statusMessage } : {}),
    ...(typeof progress === 'number' ? { progress } : {})
  }
}

function npmCommand(): string {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm'
}

function bumpInstallProgress(delta = 3) {
  if (phase !== 'installing') return
  progress = Math.min(88, (progress ?? 8) + delta)
}

async function runNpmInstall(cwd: string): Promise<void> {
  phase = 'installing'
  status = 'starting'
  progress = 8
  statusMessage = undefined

  await new Promise<void>((resolve, reject) => {
    const proc = spawn(npmCommand(), ['install', '--no-fund', '--no-audit'], {
      cwd,
      shell: process.platform === 'win32',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env
    })
    let err = ''
    const onData = () => {
      bumpInstallProgress(2)
    }
    proc.stdout?.on('data', onData)
    proc.stderr?.on('data', (chunk) => {
      onData()
      err += String(chunk)
    })
    proc.on('error', reject)
    proc.on('close', (code) => {
      if (code === 0) {
        progress = 92
        resolve()
      } else {
        reject(new Error(err.trim() || `npm install failed (${code})`))
      }
    })
  })
}

async function waitForHttpReady(url: string, timeoutMs = 120_000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (status === 'stopped') {
      throw new Error('Dev server was stopped while starting.')
    }
    progress = Math.min(98, (progress ?? 93) + 1)
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2_500) })
      if (res.ok || res.status < 500) return
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 600))
  }
  throw new Error('Timed out waiting for the Astro dev server (localhost:4321).')
}

function attachChildLogging(proc: ChildProcess): void {
  proc.stdout?.on('data', () => {
    /* progress UI uses phase labels only */
  })
  proc.stderr?.on('data', () => {
    /* progress UI uses phase labels only */
  })
  proc.on('exit', (code, signal) => {
    if (child === proc) {
      child = null
      workspaceRoot = null
      if (status !== 'stopped') {
        status = 'error'
        phase = 'idle'
        progress = undefined
        statusMessage =
          code != null
            ? `Dev server exited (code ${code}).`
            : signal
              ? `Dev server exited (${signal}).`
              : 'Dev server exited.'
      }
    }
  })
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
        spawn('taskkill', ['/pid', String(proc.pid), '/f', '/t'], { shell: true, stdio: 'ignore' })
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
  return snapshot()
}

async function ensureDependencies(root: string): Promise<void> {
  if (existsSync(path.join(root, 'node_modules'))) return
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
  progress = existsSync(path.join(resolved, 'node_modules')) ? 90 : undefined
  statusMessage = undefined

  await ensureDependencies(resolved)

  phase = 'starting-dev'
  progress = 94
  statusMessage = undefined

  const proc = spawn(npmCommand(), ['run', 'dev'], {
    cwd: resolved,
    shell: process.platform === 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, BROWSER: 'none', CI: 'true' }
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

  await waitForHttpReady(SITE_DEV_PREVIEW_URL)
  if (child !== proc) {
    throw new Error('Dev server was stopped while starting.')
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
    await shell.openExternal(SITE_DEV_PREVIEW_URL)
  }
  phase = 'idle'
  progress = undefined
  statusMessage = undefined
  return state.status === 'running' ? { ...state, progress: 100 } : state
}
