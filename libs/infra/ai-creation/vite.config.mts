/// <reference types='vitest' />
import { defineConfig } from 'vite'
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin'
import * as path from 'path'

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../../node_modules/.vite/libs/infra/ai-creation',
  plugins: [nxViteTsPaths()],
  test: {
    name: 'infra-ai-creation',
    watch: false,
    globals: true,
    environment: 'jsdom',
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../../coverage/libs/infra/ai-creation',
      provider: 'v8' as const,
    },
    passWithNoTests: false,
  },
  resolve: {
    alias: {
      '@lenserfight/types': path.resolve(import.meta.dirname, '../../types/src/index.ts'),
      '@lenserfight/providers': path.resolve(import.meta.dirname, '../../providers/src/index.ts'),
    },
  },
}))
