import path from 'node:path'
import { createRequire } from 'node:module'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

const require = createRequire(import.meta.url)
const monacoMod = require('vite-plugin-monaco-editor') as { default?: (opts?: Record<string, unknown>) => import('vite').Plugin }
const monacoEditorPlugin = typeof monacoMod === 'function' ? (monacoMod as unknown as (o?: Record<string, unknown>) => import('vite').Plugin) : monacoMod.default
if (!monacoEditorPlugin) {
  throw new Error('vite-plugin-monaco-editor failed to load')
}

const workspaceAliases = {
  '@emprint/shared': path.resolve(__dirname, '../../shared/src')
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: path.resolve(__dirname, './src/main/index.ts'),
        formats: ['cjs']
      },
      rollupOptions: {
        output: {
          format: 'cjs',
          entryFileNames: '[name].cjs'
        }
      }
    },
    resolve: {
      alias: workspaceAliases
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: path.resolve(__dirname, './src/preload/index.ts'),
        formats: ['cjs']
      },
      rollupOptions: {
        output: {
          format: 'cjs',
          entryFileNames: '[name].cjs'
        }
      }
    },
    resolve: {
      alias: workspaceAliases
    }
  },
  renderer: {
    root: path.resolve(__dirname),
    plugins: [
      react(),
      monacoEditorPlugin({
        // Workaround for vite-plugin-monaco-editor@1.1.0:
        //   the default distPath is computed via `path.join(root, outDir, base, publicPath)`,
        //   but electron-vite passes `outDir` as an ABSOLUTE path. `path.join` then
        //   concatenates the second absolute path verbatim (only stripping its leading `/`),
        //   producing a stray `apps/desktop/Users/<full-abs-path>/monacoeditorwork/` tree.
        //   `path.resolve(outDir, ...)` discards earlier absolute segments correctly.
        customDistPath: (_root: string, outDir: string, _base: string) =>
          path.resolve(outDir, 'monacoeditorwork')
      })
    ],
    resolve: {
      alias: {
        ...workspaceAliases,
        '@renderer': path.resolve(__dirname, './src/renderer/src')
      }
    },
    optimizeDeps: {
      include: ['monaco-editor', '@monaco-editor/react']
    },
    build: {
      rollupOptions: {
        input: path.resolve(__dirname, './index.html')
      }
    }
  }
})
