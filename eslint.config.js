import nxEslintPlugin from '@nx/eslint-plugin'
import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import importPlugin from 'eslint-plugin-import'
import reactHooks from 'eslint-plugin-react-hooks'
import unusedImports from 'eslint-plugin-unused-imports'
import tseslint from 'typescript-eslint'

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    plugins: {
      'unused-imports': unusedImports,
      import: importPlugin,
      'react-hooks': reactHooks,
    },
    rules: {
      // Kill unused imports automatically
      'unused-imports/no-unused-imports': 'error',
      // Allow unused vars only if prefixed with _
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],
      // Import ordering
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
            'object',
            'type',
          ],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      // React hooks safety
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
      "ignores": [
        "**/vite.config.*.timestamp*",
        "**/vitest.config.*.timestamp*"
      ]
  },
  // Nx module boundary enforcement
  {
    plugins: {
      '@nx': nxEslintPlugin,
    },
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: [],
          depConstraints: [
            // ── Scope constraints ──────────────────────────────────────
            { sourceTag: 'scope:public', onlyDependOnLibsWithTags: ['scope:public', 'scope:shared'] },
            { sourceTag: 'scope:shared', onlyDependOnLibsWithTags: ['scope:shared'] },
            // ── License constraints — OSS cannot import private ────────
            { sourceTag: 'license:oss', onlyDependOnLibsWithTags: ['license:oss', 'license:shared'] },
            // ── Layer direction (top-down only) ────────────────────────
            {
              sourceTag: 'layer:app',
              onlyDependOnLibsWithTags: [
                'layer:app', 'layer:feature', 'layer:domain', 'layer:data',
                'layer:api', 'layer:infra', 'layer:providers', 'layer:shared',
                'layer:ui', 'layer:utils', 'layer:types',
              ],
            },
            {
              sourceTag: 'layer:feature',
              onlyDependOnLibsWithTags: [
                'layer:feature', 'layer:domain', 'layer:data', 'layer:api',
                'layer:infra', 'layer:shared', 'layer:ui', 'layer:utils', 'layer:types',
              ],
            },
            {
              sourceTag: 'layer:domain',
              onlyDependOnLibsWithTags: ['layer:domain', 'layer:shared', 'layer:utils', 'layer:types'],
            },
            {
              sourceTag: 'layer:data',
              onlyDependOnLibsWithTags: [
                'layer:data', 'layer:domain', 'layer:api', 'layer:shared',
                'layer:utils', 'layer:types',
              ],
            },
            {
              sourceTag: 'layer:infra',
              onlyDependOnLibsWithTags: [
                'layer:infra', 'layer:domain', 'layer:data', 'layer:api',
                'layer:shared', 'layer:ui', 'layer:utils', 'layer:types',
              ],
            },
            {
              sourceTag: 'layer:ui',
              onlyDependOnLibsWithTags: ['layer:ui', 'layer:shared', 'layer:utils', 'layer:types'],
            },
            {
              sourceTag: 'layer:utils',
              onlyDependOnLibsWithTags: ['layer:utils', 'layer:types'],
            },
            {
              sourceTag: 'layer:shared',
              onlyDependOnLibsWithTags: ['layer:shared', 'layer:utils', 'layer:types'],
            },
            {
              sourceTag: 'layer:types',
              onlyDependOnLibsWithTags: ['layer:types'],
            },
          ],
        },
      ],
    },
  },
]
