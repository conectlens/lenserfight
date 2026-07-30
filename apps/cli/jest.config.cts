module.exports = {
  displayName: 'cli',
  preset: '../../jest.preset.cjs',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  // ink (React-for-CLI) specs are ESM/JSX and run via jest.ink.config.mjs.
  testPathIgnorePatterns: ['/node_modules/', '\\.spec\\.tsx$'],
  coverageDirectory: '../../coverage/apps/cli',
  moduleNameMapper: {
    '^yaml$': require.resolve('yaml'),
  },
}
