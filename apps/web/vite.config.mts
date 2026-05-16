/// <reference types='vitest' />
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin'
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig(() => ({
  root: import.meta.dirname,
  envDir: import.meta.dirname,
  envPrefix: ['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'API_', 'CHAINABIT_API_URL', 'CHAINABIT_OAUTH_', 'AUTH_', 'ARENA_', 'WEB_', 'DOCS_', 'STATUS_', 'OLLAMA_', 'POSTHOG_', 'CAPTCHA_', 'PRODUCT_', 'FEATURE_CHAINABIT_', 'DATA_SOURCE', 'ENABLE_', 'ALLOWED_', 'GOOGLE_'],
  cacheDir: '../../node_modules/.vite/apps/web',
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  preview: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [react(), tailwindcss(), nxViteTsPaths(), nxCopyAssetsPlugin(['*.md'])],
  // Pre-bundle CJS deps that use the lazy-getter pattern; without this Rollup's CJS plugin
  // converts `var` to `const` and crashes at runtime with TDZ errors.
  optimizeDeps: {
    include: ['sonner', 'recharts', 'react-helmet-async', '@fal-ai/client'],
  },
  build: {
    outDir: '../../dist/apps/web',
    emptyOutDir: true,
    reportCompressedSize: true,
    // 'hidden' emits maps for upload to an error tracker (Sentry/Datadog) but
    // omits the `//# sourceMappingURL=` footer so browsers do not fetch them.
    // Set VITE_BUILD_SOURCEMAP=inline locally to opt in to inline maps.
    sourcemap:
      process.env['VITE_BUILD_SOURCEMAP'] === 'inline'
        ? 'inline'
        : process.env['VITE_BUILD_SOURCEMAP'] === 'true'
          ? true
          : 'hidden',
    target: 'es2022',
  },
  test: {
    name: 'web',
    watch: false,
    globals: true,
    environment: 'jsdom',
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/apps/web',
      provider: 'v8' as const,
    },
  },
}))
