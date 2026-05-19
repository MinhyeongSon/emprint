import { existsSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { execFile, execFileSync, spawn, type SpawnOptions } from 'node:child_process'
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
    if (process.env.NVM_SYMLINK) dirs.push(process.env.NVM_SYMLINK)
    if (process.env.NVM_HOME) dirs.push(process.env.NVM_HOME)
    if (process.env.APPDATA) {
      dirs.push(path.join(process.env.APPDATA, 'npm'))
      dirs.push(path.join(process.env.APPDATA, 'nvm'))
    }
    if (process.env.LOCALAPPDATA) {
      dirs.push(path.join(process.env.LOCALAPPDATA, 'Programs', 'node'))
    }
    dirs.push(path.join(home, 'scoop', 'apps', 'nodejs', 'current', 'bin'))
  } else {
    dirs.push('/usr/local/bin', '/usr/bin')
  }

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
  const mergedPath = unique.join(path.delimiter)
  if (process.platform === 'win32') {
    return { ...base, PATH: mergedPath, Path: mergedPath }
  }
  return { ...base, PATH: mergedPath }
}

/** Resolve a binary under %SystemRoot%\\System32 (packaged apps often lack System32 on PATH). */
export function resolveWindowsSystemExecutable(name: string): string {
  const root = process.env.SystemRoot ?? 'C:\\Windows'
  const withExt = name.toLowerCase().endsWith('.exe') ? name : `${name}.exe`
  return path.join(root, 'System32', withExt)
}

function resolveNpmCliJs(npmPath: string): string | null {
  const cli = path.join(path.dirname(npmPath), 'node_modules', 'npm', 'bin', 'npm-cli.js')
  return existsSync(cli) ? cli : null
}

function resolveNpmViaWhere(): string | null {
  if (process.platform !== 'win32') return null
  try {
    const where = resolveWindowsSystemExecutable('where')
    const stdout = execFileSync(where, ['npm.cmd'], {
      env: augmentedProcessEnv(),
      encoding: 'utf8',
      windowsHide: true
    })
    const line = stdout
      .split(/\r?\n/)
      .map((entry) => entry.trim())
      .find((entry) => entry.toLowerCase().endsWith('npm.cmd') && existsSync(entry))
    return line ?? null
  } catch {
    return null
  }
}

function prependDirToPath(env: NodeJS.ProcessEnv, dir: string): NodeJS.ProcessEnv {
  const pathKey = process.platform === 'win32' ? 'Path' : 'PATH'
  const existing = env[pathKey] ?? env.PATH ?? ''
  const merged = existing ? `${dir}${path.delimiter}${existing}` : dir
  if (process.platform === 'win32') {
    return { ...env, PATH: merged, Path: merged }
  }
  return { ...env, PATH: merged }
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

  if (process.platform === 'win32') {
    const viaWhere = resolveNpmViaWhere()
    if (viaWhere) {
      cachedNpmPath = viaWhere
      return viaWhere
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
  const npmDir = path.dirname(npm)
  let env = augmentedProcessEnv({ ...process.env, ...optionEnv })
  env = prependDirToPath(env, npmDir)

  if (process.platform === 'win32') {
    // Avoid spawning npm.cmd directly — Node 20+ throws EINVAL on Windows (CVE-2024-27980).
    // Official Node installs ship npm-cli.js next to node.exe.
    const nodePath = resolveNodeExecutable(npm)
    const npmCli = resolveNpmCliJs(npm)
    if (npmCli) {
      return spawn(nodePath, [npmCli, ...npmArgs], {
        ...rest,
        env,
        cwd: options.cwd,
        windowsHide: true,
        shell: false
      })
    }
    // Fallback: npm.cmd via shell + augmented PATH (no manual cmd /c quoting).
    return spawn('npm.cmd', npmArgs, {
      ...rest,
      env,
      cwd: options.cwd,
      windowsHide: true,
      shell: true
    })
  }

  return spawn(npm, npmArgs, {
    ...rest,
    env,
    shell: false
  })
}
