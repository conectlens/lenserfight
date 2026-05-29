module.exports = {
  displayName: 'cli',
  preset: '../../jest.preset.cjs',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]sx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
    '^.+\\.m[jt]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(citty|@lenserfight/domain)/)',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    'src/commands/spec\\.ts$',
  ],
  moduleFileExtensions: ['ts', 'js', 'html', 'mjs'],
  coverageDirectory: '../../coverage/apps/cli',
  moduleNameMapper: {
    '^yaml$': require.resolve('yaml'),
  },
}
