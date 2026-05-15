/// <reference types='vitest' />
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin'
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig(() => ({
  root: import.meta.dirname,
  envDir: import.meta.dirname,
  envPrefix: ['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'ARENA_', 'AUTH_', 'WEB_', 'DATA_SOURCE'],
  cacheDir: '../../node_modules/.vite/apps/arena',
  server: {
    port: 3001,
    host: '0.0.0.0',
  },
  preview: {
    port: 3001,
    host: '0.0.0.0',
  },
  plugins: [react(), tailwindcss(), nxViteTsPaths(), nxCopyAssetsPlugin(['*.md'])],
  // Pre-bundle CJS deps with TDZ-prone init patterns — same reason as apps/web.
  optimizeDeps: {
    include: ['sonner', 'recharts'],
  },
  build: {
    outDir: '../../dist/apps/arena',
    emptyOutDir: true,
    reportCompressedSize: true,
    // 'hidden' emits maps for upload to an error tracker but omits the
    // `//# sourceMappingURL=` footer so browsers do not fetch them. Set
    // VITE_BUILD_SOURCEMAP=inline locally to opt in to inline maps.
    sourcemap:
      process.env['VITE_BUILD_SOURCEMAP'] === 'inline'
        ? 'inline'
        : process.env['VITE_BUILD_SOURCEMAP'] === 'true'
          ? true
          : 'hidden',
    target: 'es2022',
  },
  test: {
    name: 'arena',
    watch: false,
    globals: true,
    environment: 'jsdom',
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/apps/arena',
      provider: 'v8' as const,
    },
  },
}))
