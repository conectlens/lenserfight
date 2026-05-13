/// <reference types='vitest' />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin'
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(() => ({
  root: import.meta.dirname,
  envDir: import.meta.dirname,
  envPrefix: ['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'CAPTCHA_', 'AUTH_', 'WEB_', 'ARENA_', 'CHAINABIT_APP_URL', 'CHAINABIT_OAUTH_', 'PRODUCT_', 'FEATURE_', 'MOCK', 'DATA_SOURCE'],
  cacheDir: '../../node_modules/.vite/apps/auth',
  server: {
    port: 3004,
    host: '0.0.0.0',
  },
  preview: {
    port: 3004,
    host: '0.0.0.0',
  },
  plugins: [react(), tailwindcss(), nxViteTsPaths(), nxCopyAssetsPlugin(['*.md'])],
  // Uncomment this if you are using workers.
  // worker: {
  //   plugins: () => [ nxViteTsPaths() ],
  // },
  build: {
    outDir: '../../dist/apps/auth',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
  test: {
    name: 'auth',
    watch: false,
    globals: true,
    environment: 'jsdom',
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/apps/auth',
      provider: 'v8' as const,
    },
  },
}))
