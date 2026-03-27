/// <reference types='vitest' />
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin'
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/apps/forum',
  server: {
    port: 3000,
    host: 'localhost',
  },
  preview: {
    port: 3000,
    host: 'localhost',
  },
  plugins: [react(), tailwindcss(), nxViteTsPaths(), nxCopyAssetsPlugin(['*.md'])],
  // Uncomment this if you are using workers.
  // worker: {
  //   plugins: () => [ nxViteTsPaths() ],
  // },
  build: {
    outDir: '../../dist/apps/forum',
    emptyOutDir: true,
    reportCompressedSize: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined

          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('react-is') ||
            id.includes('scheduler') ||
            id.includes('loose-envify') ||
            id.includes('js-tokens') ||
            id.includes('object-assign') ||
            id.includes('use-sync-external-store')
          ) {
            return 'react-vendor'
          }
          if (
            id.includes('react-router-dom') ||
            id.includes('react-router') ||
            id.includes('@remix-run/router')
          ) {
            return 'router-vendor'
          }
          if (id.includes('@tanstack/react-query') || id.includes('@tanstack/query-core')) {
            return 'query-vendor'
          }
          if (id.includes('framer-motion')) return 'motion-vendor'
          if (id.includes('lucide-react')) return 'icons-vendor'
          if (id.includes('i18next') || id.includes('react-i18next')) return 'i18n-vendor'
          if (id.includes('@supabase/supabase-js')) return 'supabase-vendor'
          if (
            id.includes('@uiw/react-md-editor') ||
            id.includes('react-markdown') ||
            id.includes('rehype-raw')
          ) {
            return 'markdown-vendor'
          }
          if (id.includes('posthog-js')) return 'analytics-vendor'
          return 'vendor'
        },
      },
    },
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
  test: {
    name: 'forum',
    watch: false,
    globals: true,
    environment: 'jsdom',
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/apps/forum',
      provider: 'v8' as const,
    },
  },
}))
