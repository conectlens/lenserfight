import nx from '@nx/eslint-plugin'

import baseConfig from '../../eslint.config.js'

export default [
  ...baseConfig,
  ...nx.configs['flat/react'],
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    // Override or add rules here
    rules: {
      // The inferred mobile lint target runs from apps/mobile, which prevents the
      // Nx boundary rule from resolving this app's project tags reliably.
      '@nx/enforce-module-boundaries': 'off',
    },
  },
  {
    files: [
      '*.config.js',
      '*.config.cjs',
      '*.config.cts',
      '*.config.mjs',
      'jest.resolver.cjs',
      'src/**/*.spec.ts',
      'src/**/*.spec.tsx',
    ],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      '@nx/enforce-module-boundaries': 'off',
    },
  },
  {
    ignores: ['.expo', 'web-build', 'cache', 'dist'],
  },
]
