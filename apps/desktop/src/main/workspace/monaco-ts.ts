import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
import type { MonacoExtraLib, WorkspaceMonacoTypescriptPayload } from '@emprint/shared'

const MAX_EXTRA_LIB_BYTES = 6 * 1024 * 1024
const MAX_EXTRA_LIB_FILES = 320

const WORKSPACE_MODULE_SHIM = `/* Emprint Monaco workspace shims */
declare module '*.json' {
  const value: Record<string, unknown>
  export default value
}

declare module 'astro:content' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function defineCollection(config: any): any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function getCollection(name: string, filter?: (entry: any) => boolean): Promise<any[]>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function render(entry: any): Promise<{ Content: any }>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const z: any
}
declare module 'astro/loaders' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function glob(config: { pattern: string; base: string }): any
}
`

function readConfigHost(workspaceRoot: string): ts.ParseConfigHost {
  return {
    fileExists: (f) => existsSync(f),
    readDirectory: ts.sys.readDirectory,
    readFile: (f) => {
      try {
        return readFileSync(f, 'utf8')
      } catch {
        return undefined
      }
    },
    useCaseSensitiveFileNames: ts.sys.useCaseSensitiveFileNames
  }
}

function enumKey(map: Record<string, unknown>, value: number | undefined): string | undefined {
  if (value === undefined) return undefined
  for (const key of Object.keys(map)) {
    if (!Number.isNaN(Number(key)) && map[key] === value) {
      return key
    }
  }
  return undefined
}

function toPayloadCompilerOptions(
  workspaceRoot: string,
  options: ts.CompilerOptions
): WorkspaceMonacoTypescriptPayload['compilerOptions'] {
  const paths = options.paths
  const normalizedPaths =
    paths && typeof paths === 'object'
      ? Object.fromEntries(
          Object.entries(paths).map(([key, value]) => {
            const arr = Array.isArray(value) ? value : [value]
            return [
              key,
              arr
                .filter((v): v is string => typeof v === 'string')
                .map((v) => v.replace(/^\.\//, '').replace(/^\//, ''))
            ]
          })
        )
      : undefined

  const baseUrlRaw = options.baseUrl ?? '.'
  const baseUrl = path.resolve(workspaceRoot, baseUrlRaw).replace(/\\/g, '/')

  const out: WorkspaceMonacoTypescriptPayload['compilerOptions'] = {
    baseUrl,
    skipLibCheck: options.skipLibCheck ?? true
  }
  const target = enumKey(ts.ScriptTarget as Record<string, unknown>, options.target)
  const module = enumKey(ts.ModuleKind as Record<string, unknown>, options.module)
  const moduleResolution = enumKey(ts.ModuleResolutionKind as Record<string, unknown>, options.moduleResolution)
  const jsx = enumKey(ts.JsxEmit as Record<string, unknown>, options.jsx)
  if (target) out.target = target
  if (module) out.module = module
  if (moduleResolution) out.moduleResolution = moduleResolution
  if (jsx) out.jsx = jsx
  if (options.lib) out.lib = options.lib
  if (normalizedPaths && Object.keys(normalizedPaths).length > 0) out.paths = normalizedPaths
  if (options.strict !== undefined) out.strict = options.strict
  if (options.allowJs !== undefined) out.allowJs = options.allowJs
  if (options.esModuleInterop !== undefined) out.esModuleInterop = options.esModuleInterop
  if (options.resolveJsonModule !== undefined) out.resolveJsonModule = options.resolveJsonModule
  if (options.allowImportingTsExtensions !== undefined) {
    out.allowImportingTsExtensions = options.allowImportingTsExtensions
  }
  if (options.isolatedModules !== undefined) out.isolatedModules = options.isolatedModules
  return out
}

function toMonacoFileUri(absPath: string): string {
  const normalized = path.resolve(absPath).replace(/\\/g, '/')
  const encoded = normalized
    .split('/')
    .map((segment, index) => {
      if (index === 0 && /^[a-zA-Z]:$/.test(segment)) return segment
      return encodeURIComponent(segment)
    })
    .join('/')
  return `file:///${encoded}`
}

function collectDtsFiles(dir: string, into: string[], budget: { bytes: number; count: number }): void {
  if (!existsSync(dir) || budget.count >= MAX_EXTRA_LIB_FILES || budget.bytes >= MAX_EXTRA_LIB_BYTES) {
    return
  }
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return
  }
  for (const name of entries) {
    if (budget.count >= MAX_EXTRA_LIB_FILES || budget.bytes >= MAX_EXTRA_LIB_BYTES) break
    const abs = path.join(dir, name)
    let st
    try {
      st = statSync(abs)
    } catch {
      continue
    }
    if (st.isDirectory()) {
      if (name === 'dist-node' || name === '.turbo') continue
      collectDtsFiles(abs, into, budget)
    } else if (name.endsWith('.d.ts') || name.endsWith('.d.cts') || name.endsWith('.d.mts')) {
      into.push(abs)
      budget.count += 1
      budget.bytes += st.size
    }
  }
}

function readExtraLibs(workspaceRoot: string): MonacoExtraLib[] {
  const files: string[] = []
  const budget = { bytes: 0, count: 0 }

  const astroPkg = path.join(workspaceRoot, 'node_modules', 'astro')
  if (existsSync(astroPkg)) {
    collectDtsFiles(astroPkg, files, budget)
  }

  const zodPkg = path.join(workspaceRoot, 'node_modules', 'zod')
  if (existsSync(zodPkg)) {
    collectDtsFiles(zodPkg, files, budget)
  }

  const envDts = path.join(workspaceRoot, 'src', 'env.d.ts')
  if (existsSync(envDts)) {
    files.push(envDts)
  }

  const siteJson = path.join(workspaceRoot, 'config', 'site.json')
  if (existsSync(siteJson)) {
    files.push(siteJson)
  }

  const libs: MonacoExtraLib[] = [
    {
      filePath: 'file:///emprint-shims/workspace-modules.d.ts',
      content: WORKSPACE_MODULE_SHIM
    }
  ]

  let totalBytes = WORKSPACE_MODULE_SHIM.length
  for (const abs of files) {
    if (totalBytes >= MAX_EXTRA_LIB_BYTES) break
    try {
      const raw = readFileSync(abs, 'utf8')
      totalBytes += raw.length
      if (abs.endsWith('.json')) {
        libs.push({
          filePath: toMonacoFileUri(abs),
          content: `const data = ${raw.trim()};\nexport default data;\n`
        })
      } else {
        libs.push({
          filePath: toMonacoFileUri(abs),
          content: raw
        })
      }
    } catch {
      /* skip */
    }
  }
  return libs
}

export function resolveWorkspaceMonacoTypescript(workspaceRoot: string): WorkspaceMonacoTypescriptPayload | null {
  const root = path.resolve(workspaceRoot)
  const configPath = path.join(root, 'tsconfig.json')
  if (!existsSync(configPath)) return null

  const readResult = ts.readConfigFile(configPath, (fileName) => {
    try {
      return readFileSync(fileName, 'utf8')
    } catch {
      return undefined
    }
  })

  if (readResult.error) {
    return null
  }

  const parsed = ts.parseJsonConfigFileContent(
    readResult.config,
    readConfigHost(root),
    root,
    undefined,
    configPath
  )

  const compilerOptions = toPayloadCompilerOptions(root, parsed.options)
  const nodeModulesMissing = !existsSync(path.join(root, 'node_modules'))
  const extraLibs = readExtraLibs(root)

  return {
    workspaceRoot: root,
    compilerOptions,
    extraLibs,
    ...(nodeModulesMissing ? { nodeModulesMissing: true } : {})
  }
}
