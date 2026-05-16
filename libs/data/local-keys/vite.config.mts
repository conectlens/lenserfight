/// <reference types='vitest' />
import { defineConfig } from 'vite'
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin'

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../../node_modules/.vite/libs/data/local-keys',
  plugins: [nxViteTsPaths()],
  test: {
    name: 'data-local-keys',
    watch: false,
    globals: true,
    environment: 'node',
    include: ['{src,tests}/**/*.{test,spec}.ts'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../../coverage/libs/data/local-keys',
      provider: 'v8' as const,
    },
  },
}))
