/// <reference types="jest" />
/// <reference types="node" />
module.exports = {
  displayName: 'mobile',
  preset: 'jest-expo',
  moduleFileExtensions: ['native.ts', 'native.tsx', 'ts', 'js', 'html', 'tsx', 'jsx'],
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  moduleNameMapper: {
    '\\.svg$': '@nx/expo/plugins/jest/svg-mock',
    '^react-test-renderer/package.json$':
      '<rootDir>/src/test-mocks/react-test-renderer-package.json',
    '^@react-native-community/netinfo$': '<rootDir>/src/test-mocks/netinfo-mock.ts',
    '^posthog-react-native$': '<rootDir>/src/test-mocks/posthog-mock.tsx',
    '^@expo/vector-icons$': '<rootDir>/src/test-mocks/vector-icons-mock.tsx',
    '^react$': '<rootDir>/../../node_modules/react',
    '^react/(.+)$': '<rootDir>/../../node_modules/react/$1',
    '^@lenserfight/features/auth/native$': '<rootDir>/../../libs/features/auth/src/native.ts',
    '^@lenserfight/features/profile/native$':
      '<rootDir>/../../libs/features/profile/src/native.ts',
    '^@lenserfight/data/repositories/mobile$':
      '<rootDir>/../../libs/data/repositories/src/mobile.ts',
    '^@lenserfight/ui/layout/native$': '<rootDir>/../../libs/ui/layout/src/native.ts',
    '^@lenserfight/ui/forms/native$': '<rootDir>/../../libs/ui/forms/src/native.ts',
    '^@lenserfight/ui/feedback/native$': '<rootDir>/../../libs/ui/feedback/src/native.ts',
    '^@lenserfight/ui/primitives/native$':
      '<rootDir>/../../libs/ui/primitives/src/native.ts',
    '^@lenserfight/ui/providers/native$': '<rootDir>/../../libs/ui/providers/src/native.ts',
    '^@lenserfight/([^/]+)$': '<rootDir>/../../libs/$1/src/index.ts',
    '^@lenserfight/([^/]+)/(.+)$': '<rootDir>/../../libs/$1/$2/src/index.ts',
  },
  transform: {
    '\\.[jt]sx?$': [
      'babel-jest',
      {
        configFile: __dirname + '/.babelrc.js',
      },
    ],
    '^.+\\.(bmp|gif|jpg|jpeg|mp4|png|psd|svg|webp|ttf|otf|m4v|mov|mp4|mpeg|mpg|webm|aac|aiff|caf|m4a|mp3|wav|html|pdf|obj)$':
      require.resolve('jest-expo/src/preset/assetFileTransformer.js'),
  },
  coverageDirectory: '../../coverage/apps/mobile',
}
