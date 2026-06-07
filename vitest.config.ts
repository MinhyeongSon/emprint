import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: [
      'core/**/*.test.ts',
      'shared/**/*.test.ts',
      'apps/desktop/src/main/**/*.test.ts'
    ],
    environment: 'node'
  },
  resolve: {
    alias: {
      '@emprint/shared': path.resolve(__dirname, 'shared/src/index.ts'),
      '@emprint/shared/*': path.resolve(__dirname, 'shared/src'),
      '@emprint/core': path.resolve(__dirname, 'core/src/index.ts'),
      '@emprint/core/*': path.resolve(__dirname, 'core/src')
    }
  }
})
