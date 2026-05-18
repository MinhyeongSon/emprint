import { existsSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { execFile, spawn, type SpawnOptions } from 'node:child_process'
import { promisify } from 'node:util'
import type { NodeDetectResult } from '@emprint/shared'

const execFileAsync = promisify(execFile)

export const NODE_MINIMUM_MAJOR = 22

const NPM_NOT_FOUND_MESSAGE =
  'Node.js and npm were not found. Install Node.js 22 or newer from https://nodejs.org (or Homebrew: brew install node), then quit and reopen Emprint.'

let cachedNpmPath: string | null | undefined

function compareVersionDesc(a: string, b: string): number {
  const parts = (name: string) =>
    name
      .replace(/^v/i, '')
      .split('.')
      .map((segment) => Number.parseInt(segment, 10) || 0)
  const aa = parts(a)
  const bb = parts(b)
  const len = Math.max(aa.length, bb.length)
  for (let i = 0; i < len; i++) {
    const diff = (bb[i] ?? 0) - (aa[i] ?? 0)
    if (diff !== 0) return diff
  }
  return 0
}

function nvmNodeBinDirs(): string[] {
  const root = path.join(homedir(), '.nvm', 'versions', 'node')
  if (!existsSync(root)) return []
  try {
    return readdirSync(root, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort(compareVersionDesc)
      .map((version) => path.join(root, version, 'bin'))
  } catch {
    return []
  }
}

/** Directories where Node/npm are commonly installed (GUI apps often lack these on PATH). */
export function nodeToolchainSearchDirs(): string[] {
  const home = homedir()
  const dirs: string[] = []

  if (process.platform === 'darwin') {
    dirs.push('/opt/homebrew/bin', '/usr/local/bin')
  }

  if (process.platform === 'win32') {
    const programFiles = process.env.ProgramFiles ?? 'C:\\Program Files'
    const programFilesX86 = process.env['ProgramFiles(x86)'] ?? 'C:\\Program Files (x86)'
    dirs.push(path.join(programFiles, 'nodejs'), path.join(programFilesX86, 'nodejs'))
    if (process.env.APPDATA) dirs.push(path.join(process.env.APPDATA, 'npm'))
    if (process.env.LOCALAPPDATA) {
      dirs.push(path.join(process.env.LOCALAPPDATA, 'Programs', 'node'))
    }
  }

  dirs.push('/usr/local/bin', '/usr/bin')

  dirs.push(
    path.join(home, '.volta', 'bin'),
    path.join(home, '.fnm', 'current', 'bin'),
    path.join(home, '.local', 'bin'),
    path.join(home, '.local', 'share', 'mise', 'shims'),
    path.join(home, '.asdf', 'shims')
  )

  dirs.push(...nvmNodeBinDirs())

  return dirs
}

/** PATH with Homebrew, nvm, fnm, and other common Node install locations prepended. */
export function augmentedProcessEnv(
  base: NodeJS.ProcessEnv = process.env
): NodeJS.ProcessEnv {
  const extra = nodeToolchainSearchDirs()
  const merged = [...extra, ...(base.PATH?.split(path.delimiter) ?? [])].filter(Boolean)
  const seen = new Set<string>()
  const unique: string[] = []
  for (const entry of merged) {
    if (seen.has(entry)) continue
    seen.add(entry)
    unique.push(entry)
  }
  return { ...base, PATH: unique.join(path.delimiter) }
}

function npmFileName(): string {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm'
}

/** Resolve an npm executable usable from a packaged Electron app (Finder / DMG launch). */
export function resetNodeToolchainCache(): void {
  cachedNpmPath = undefined
}

export function resolveNpmExecutable(): string | null {
  if (cachedNpmPath !== undefined) return cachedNpmPath

  const name = npmFileName()
  const searchDirs = [
    ...nodeToolchainSearchDirs(),
    ...(process.env.PATH?.split(path.delimiter) ?? [])
  ]

  for (const dir of searchDirs) {
    if (!dir) continue
    const candidate = path.join(dir, name)
    if (existsSync(candidate)) {
      cachedNpmPath = candidate
      return candidate
    }
    if (process.platform !== 'win32') {
      const unixNpm = path.join(dir, 'npm')
      if (existsSync(unixNpm)) {
        cachedNpmPath = unixNpm
        return unixNpm
      }
    }
  }

  cachedNpmPath = null
  return null
}

export function assertNpmExecutable(): string {
  const npm = resolveNpmExecutable()
  if (!npm) throw new Error(NPM_NOT_FOUND_MESSAGE)
  return npm
}

function resolveNodeExecutable(npmPath: string): string {
  const nodeName = process.platform === 'win32' ? 'node.exe' : 'node'
  const sibling = path.join(path.dirname(npmPath), nodeName)
  if (existsSync(sibling)) return sibling

  for (const dir of nodeToolchainSearchDirs()) {
    const candidate = path.join(dir, nodeName)
    if (existsSync(candidate)) return candidate
  }

  return nodeName
}

async function tryNodeVersion(nodeBinary: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync(nodeBinary, ['--version'], {
      env: augmentedProcessEnv()
    })
    const trimmed = stdout.trim()
    return trimmed || null
  } catch {
    return null
  }
}

function parseNodeMajor(version: string | undefined): number {
  if (!version) return 0
  const match = version.match(/v?(\d+)/)
  return match ? Number.parseInt(match[1]!, 10) : 0
}

/** Probe Node.js + npm for Wizard gating and Design preview. */
export async function detectNodeToolchain(): Promise<NodeDetectResult> {
  const minimumVersion = String(NODE_MINIMUM_MAJOR)
  const npmPath = resolveNpmExecutable()
  if (!npmPath) {
    return { available: false, meetsMinimum: false, minimumVersion }
  }

  const nodePath = resolveNodeExecutable(npmPath)
  const version = await tryNodeVersion(nodePath)
  const major = parseNodeMajor(version ?? undefined)

  const result: NodeDetectResult = {
    available: Boolean(version),
    nodePath,
    npmPath,
    meetsMinimum: major >= NODE_MINIMUM_MAJOR,
    minimumVersion
  }
  if (version) result.version = version
  return result
}

export function spawnNpm(npmArgs: string[], options: SpawnOptions & { cwd: string }): ReturnType<typeof spawn> {
  const npm = assertNpmExecutable()
  const { env: optionEnv, ...rest } = options
  return spawn(npm, npmArgs, {
    ...rest,
    env: augmentedProcessEnv({ ...process.env, ...optionEnv }),
    shell: process.platform === 'win32'
  })
}
