/// <reference types='vitest' />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin'
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin'
import { resolve } from 'node:path'

export default defineConfig(() => ({
  root: import.meta.dirname,
  envDir: resolve(import.meta.dirname, '../..'),
  cacheDir: '../../node_modules/.vite/apps/docs',

  server: {
    port: 3002,
    host: '0.0.0.0',
  },

  preview: {
    port: 3002,
    host: '0.0.0.0',
  },

  plugins: [react(), nxViteTsPaths(), nxCopyAssetsPlugin(['*.md'])],

  build: {
    outDir: '../../dist/apps/docs',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },

  test: {
    name: 'docs',
    watch: false,
    globals: true,
    environment: 'jsdom',
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/apps/docs',
      provider: 'v8' as const,
    },
  },
}))
