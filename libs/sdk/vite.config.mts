/// <reference types='vitest' />
import * as path from 'path'

import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin'
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/libs/sdk',
  plugins: [
    nxViteTsPaths(),
    nxCopyAssetsPlugin(['*.md']),
    dts({
      entryRoot: 'src',
      tsconfigPath: path.join(import.meta.dirname, 'tsconfig.lib.json'),
      pathsToAliases: false,
    }),
  ],
  build: {
    outDir: '../../dist/libs/sdk',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: { transformMixedEsModules: true },
    lib: {
      entry: 'src/index.ts',
      name: 'sdk',
      fileName: (format) => format === 'cjs' ? 'index.cjs' : 'index.mjs',
      formats: ['es', 'cjs'] as const,
    },
    rollupOptions: {
      external: ['@supabase/supabase-js'],
    },
  },
  test: {
    name: 'sdk',
    watch: false,
    globals: true,
    environment: 'node',
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/libs/sdk',
      provider: 'v8' as const,
    },
  },
}))
