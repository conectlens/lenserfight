/// <reference types='vitest' />
import { defineConfig } from 'vite'
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin'
import * as path from 'path'

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../../node_modules/.vite/libs/infra/execution',
  plugins: [nxViteTsPaths()],
  test: {
    name: 'infra-execution',
    watch: false,
    globals: true,
    environment: 'node',
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../../coverage/libs/infra/execution',
      provider: 'v8' as const,
    },
    passWithNoTests: false,
  },
  resolve: {
    alias: {
      '@lenserfight/types': path.resolve(import.meta.dirname, '../../types/src/index.ts'),
    },
  },
}))
