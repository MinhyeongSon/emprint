import path from 'node:path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { createLogger } from 'vite'

/** Suppress known-benign Monaco dev noise (dynamic import + missing upstream source maps). */
const rendererLogger = createLogger()
const rendererWarn = rendererLogger.warn.bind(rendererLogger)
rendererLogger.warn = (msg, options) => {
  if (typeof msg === 'string') {
    if (msg.includes('dynamic import cannot be analyzed')) return
    if (msg.includes('Failed to load source map') && msg.includes('monaco-editor')) return
  }
  rendererWarn(msg, options)
}

const repoRoot = path.resolve(__dirname, '../..')
const desktopOutDir = path.resolve(__dirname, './out')
const viteCacheDir = path.resolve(repoRoot, '.cache/vite/desktop')

const workspaceAliases = {
  '@emprint/shared': path.resolve(repoRoot, 'shared/src'),
  '@emprint/core': path.resolve(repoRoot, 'core/src')
}

/** Native addons must stay external (bundling breaks dynamic .node loading in Electron). */
const mainExternals = ['sharp']

const nodeProcessBuild = (
  subdir: 'main' | 'preload',
  entry: string,
  externals: string[] = [],
) => ({
  outDir: path.join(desktopOutDir, subdir),
  rollupOptions: {
    external: externals,
    output: {
      format: 'cjs' as const,
      entryFileNames: '[name].cjs'
    }
  },
  lib: {
    entry: path.resolve(__dirname, entry),
    formats: ['cjs' as const]
  }
})

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: nodeProcessBuild('main', './src/main/index.ts', mainExternals),
    resolve: {
      alias: workspaceAliases
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: nodeProcessBuild('preload', './src/preload/index.ts'),
    resolve: {
      alias: workspaceAliases
    }
  },
  renderer: {
    root: path.resolve(__dirname),
    cacheDir: viteCacheDir,
    customLogger: rendererLogger,
    plugins: [react()],
    resolve: {
      alias: {
        ...workspaceAliases,
        '@renderer': path.resolve(__dirname, './src/renderer/src')
      }
    },
    optimizeDeps: {
      // Workers are registered in `monaco-workers.ts` via `?worker`; pre-bundling
      // monaco-editor triggers benign "dynamic import cannot be analyzed" warnings.
      include: ['@monaco-editor/react'],
      exclude: ['monaco-editor']
    },
    build: {
      outDir: path.join(desktopOutDir, 'renderer'),
      rollupOptions: {
        input: path.resolve(__dirname, './index.html')
      }
    }
  }
})
