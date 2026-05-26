module.exports = {
  displayName: 'mobile',
  preset: 'jest-expo',
  resolver: '<rootDir>/jest.resolver.cjs',
  moduleFileExtensions: ['ts', 'js', 'html', 'tsx', 'jsx'],
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  moduleNameMapper: {
    '\\.svg$': '@nx/expo/plugins/jest/svg-mock',
    '^react-native-safe-area-context$':
      '<rootDir>/src/__mocks__/react-native-safe-area-context.tsx',
    '^posthog-react-native$': '<rootDir>/src/__mocks__/posthog-react-native.tsx',
  },
  transform: {
    '\\.[jt]sx?$': [
      'babel-jest',
      { configFile: require('path').resolve(__dirname, 'babel.config.js') },
    ],
    '^.+\\.(bmp|gif|jpg|jpeg|mp4|png|psd|svg|webp|ttf|otf|m4v|mov|mp4|mpeg|mpg|webm|aac|aiff|caf|m4a|mp3|wav|html|pdf|obj)$':
      require.resolve('jest-expo/src/preset/assetFileTransformer.js'),
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(\\.pnpm|react-native|@react-native|@react-native-community|expo|@expo|react-navigation|@react-navigation|@testing-library))',
    '/node_modules/.pnpm/react-native-reanimated.*/node_modules/react-native-reanimated/plugin/',
  ],
  coverageDirectory: '../../coverage/apps/mobile',
}
