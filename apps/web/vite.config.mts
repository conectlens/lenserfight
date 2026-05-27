/// <reference types='vitest' />
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin'
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import { themeInitPlugin } from '../../libs/ui/theme/src/lib/viteThemePlugin'

/**
 * Emits /version.json into the build output so the running app can detect
 * when a newer deployment is available without a service worker.
 */
function versionManifestPlugin(version: string, channel: string): Plugin {
  return {
    name: 'lf-version-manifest',
    apply: 'build',
    closeBundle() {
      const outDir = resolve(import.meta.dirname, '../../dist/apps/web')
      writeFileSync(
        resolve(outDir, 'version.json'),
        JSON.stringify({ version, channel, buildId: Date.now().toString(36) }, null, 2) + '\n',
        'utf-8',
      )
    },
  }
}

function resolveAppVersion(): { version: string; channel: string } {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pkg = require('../../package.json') as { version?: string }
    const version = pkg.version ?? '0.0.0-dev'
    const channel = version.includes('-nightly') ? 'nightly'
      : version.includes('-beta') ? 'beta'
      : version.includes('-rc') ? 'rc'
      : version.includes('-') ? 'dev'
      : 'stable'
    return { version, channel }
  } catch {
    return { version: '0.0.0-dev', channel: 'dev' }
  }
}

export default defineConfig(() => {
  const { version, channel } = resolveAppVersion()
  return {
    root: import.meta.dirname,
    // Root workspace dir — shared Supabase/service vars live in the root .env.local;
    // app-specific overrides (ports, feature flags) can stay in apps/web/.env.local
    // via Vite's .env merge order: root .env → root .env.local → mode files.
    envDir: resolve(import.meta.dirname, '../..'),
    envPrefix: ['SUPABASE_URL', 'SUPABASE_PUBLIC_URL', 'SUPABASE_PUBLISHABLE_KEY', 'MEDIA_', 'API_', 'CHAINABIT_API_URL', 'AUTH_', 'ARENA_', 'WEB_', 'DOCS_', 'STATUS_', 'OLLAMA_', 'POSTHOG_', 'CAPTCHA_', 'PRODUCT_', 'FEATURE_CHAINABIT_', 'DATA_SOURCE', 'ENABLE_', 'ALLOWED_', 'GOOGLE_'],
    cacheDir: '../../node_modules/.vite/apps/web',
    define: {
      __APP_VERSION__: JSON.stringify(version),
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    preview: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react(), tailwindcss(), nxViteTsPaths(), nxCopyAssetsPlugin(['*.md']), versionManifestPlugin(version, channel), themeInitPlugin()],
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
  }
})
