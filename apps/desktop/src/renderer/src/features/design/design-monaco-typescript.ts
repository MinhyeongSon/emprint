import type { EditorProps } from '@monaco-editor/react'
import type { WorkspaceMonacoCompilerOptions, WorkspaceMonacoTypescriptPayload } from '@emprint/shared'

type Monaco = Parameters<NonNullable<EditorProps['onMount']>>[1]

function enumValue(map: object, key: string | undefined, fallback: number): number {
  if (!key) return fallback
  const record = map as Record<string, number>
  return record[key] ?? fallback
}

function toMonacoCompilerOptions(monaco: Monaco, input: WorkspaceMonacoCompilerOptions) {
  const { typescript: ts } = monaco.languages
  const bundler =
    (ts.ModuleResolutionKind as unknown as Record<string, number>).Bundler ??
    ts.ModuleResolutionKind.NodeJs

  return {
    allowJs: input.allowJs ?? true,
    allowNonTsExtensions: true,
    esModuleInterop: input.esModuleInterop ?? true,
    isolatedModules: input.isolatedModules ?? true,
    jsx: enumValue(ts.JsxEmit, input.jsx, ts.JsxEmit.ReactJSX),
    module: enumValue(ts.ModuleKind, input.module, ts.ModuleKind.ESNext),
    moduleResolution: enumValue(ts.ModuleResolutionKind, input.moduleResolution, bundler),
    noEmit: true,
    resolveJsonModule: input.resolveJsonModule ?? true,
    skipLibCheck: input.skipLibCheck ?? true,
    strict: input.strict ?? true,
    target: enumValue(ts.ScriptTarget, input.target, ts.ScriptTarget.ES2020),
    ...(input.lib?.length ? { lib: input.lib } : {}),
    ...(input.baseUrl ? { baseUrl: input.baseUrl } : {}),
    ...(input.paths ? { paths: input.paths } : {})
  }
}

let configuredWorkspaceRoot: string | null = null

export function resetMonacoWorkspaceConfig(): void {
  configuredWorkspaceRoot = null
}

/** Absolute `file://` URI for Monaco models (encodes `[...slug]` etc.). */
export function workspaceFileToMonacoUri(workspaceRoot: string, srcRelativePath: string): string {
  const root = workspaceRoot.replace(/\\/g, '/').replace(/\/+$/, '')
  const rel = srcRelativePath.replace(/\\/g, '/').replace(/^\/+/, '')
  const combined = `${root}/${rel}`
  const encoded = combined
    .split('/')
    .map((segment, index) => {
      if (index === 0 && /^[a-zA-Z]:$/.test(segment)) return segment
      return encodeURIComponent(segment)
    })
    .join('/')
  return `file:///${encoded}`
}

export async function configureMonacoForWorkspace(monaco: Monaco): Promise<WorkspaceMonacoTypescriptPayload | null> {
  const api = window.emprint?.workspaceSrc?.getMonacoTypescript
  if (!api) return null

  const payload = await api()
  if (!payload) return null

  const tsDefaults = monaco.languages.typescript.typescriptDefaults
  const jsDefaults = monaco.languages.typescript.javascriptDefaults

  const compilerOptions = toMonacoCompilerOptions(monaco, payload.compilerOptions)
  tsDefaults.setCompilerOptions(compilerOptions)
  jsDefaults.setCompilerOptions(compilerOptions)

  tsDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
    noSuggestionDiagnostics: false
  })

  const extraLibs = payload.extraLibs.map((lib) => ({
    content: lib.content,
    filePath: lib.filePath
  }))

  const defaultsWithSetExtraLibs = tsDefaults as typeof tsDefaults & {
    setExtraLibs?: (libs: { content: string; filePath: string }[]) => void
  }
  if (typeof defaultsWithSetExtraLibs.setExtraLibs === 'function') {
    defaultsWithSetExtraLibs.setExtraLibs(extraLibs)
  } else {
    for (const lib of extraLibs) {
      tsDefaults.addExtraLib(lib.content, lib.filePath)
    }
  }

  configuredWorkspaceRoot = payload.workspaceRoot

  // Re-run diagnostics on open TypeScript models after libs/options change.
  for (const model of monaco.editor.getModels()) {
    if (model.getLanguageId() === 'typescript' || model.getLanguageId() === 'javascript') {
      const uri = model.uri.toString()
      if (uri.includes('/src/') || uri.includes('%2Fsrc%2F')) {
        monaco.editor.setModelMarkers(model, 'typescript', [])
      }
    }
  }

  return payload
}
