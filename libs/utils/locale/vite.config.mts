/// <reference types='vitest' />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import * as path from 'path';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../../node_modules/.vite/libs/utils/locale',
  plugins: [react(), nxViteTsPaths(), nxCopyAssetsPlugin(['*.md']), dts({ entryRoot: 'src', tsconfigPath: path.join(import.meta.dirname, 'tsconfig.lib.json'), pathsToAliases: false })],
  build: {
    outDir: '../../../dist/libs/utils/locale',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    lib: {
      entry: 'src/index.ts',
      name: 'util-locale',
      fileName: 'index',
      formats: ['es' as const]
    },
    rollupOptions: {
      external: ['react','react-dom','react/jsx-runtime']
    },
  },
  test: {
    name: 'util-locale',
    watch: false,
    globals: true,
    environment: 'node',
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../../coverage/libs/utils/locale',
      provider: 'v8' as const,
    }
  },
}));
