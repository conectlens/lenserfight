// Dedicated ESM jest config for ink (React-for-CLI) specs. ink and
// ink-testing-library are pure ESM, so these tsx specs run under jest's ESM
// runtime (invoke with NODE_OPTIONS=--experimental-vm-modules). The main CJS
// suite (jest.config.cts) ignores *.spec.tsx and is unaffected.
import { readFileSync } from 'node:fs'
import { pathsToModuleNameMapper } from 'ts-jest'

const base = JSON.parse(readFileSync(new URL('../../tsconfig.base.json', import.meta.url), 'utf8'))
const workspacePaths = pathsToModuleNameMapper(base.compilerOptions.paths ?? {}, {
  prefix: '<rootDir>/../../',
})

export default {
  displayName: 'cli-ink',
  testEnvironment: 'node',
  rootDir: '.',
  roots: ['<rootDir>/src'],
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  testMatch: ['<rootDir>/src/**/*.spec.tsx'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'mjs', 'json'],
  moduleNameMapper: {
    // @lenserfight/* workspace aliases from tsconfig.base.json.
    ...workspacePaths,
  },
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          jsx: 'react-jsx',
          jsxImportSource: 'react',
          module: 'esnext',
          moduleResolution: 'bundler',
          target: 'es2022',
          esModuleInterop: true,
          verbatimModuleSyntax: false,
          isolatedModules: true,
        },
      },
    ],
  },
}
