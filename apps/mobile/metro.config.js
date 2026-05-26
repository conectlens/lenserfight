const { getDefaultConfig } = require('@expo/metro-config')
const { withNxMetro } = require('@nx/expo')
const { mergeConfig } = require('metro-config')

// NOTE: EXPO_ROUTER_APP_ROOT is NOT set here. babel-preset-expo inlines it at
// transform time from the expo-router plugin's `root` option (app.config.js).
// Setting the env var here has no effect — the Babel AST transform wins.

const defaultConfig = getDefaultConfig(__dirname)
const { assetExts, sourceExts } = defaultConfig.resolver

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const customConfig = {
  cacheVersion: 'mobile',
  transformer: {
    babelTransformerPath: require.resolve('react-native-svg-transformer'),
  },
  resolver: {
    assetExts: assetExts.filter((ext) => ext !== 'svg'),
    sourceExts: [...sourceExts, 'cjs', 'mjs', 'svg'],
  },
}

module.exports = withNxMetro(mergeConfig(defaultConfig, customConfig), {
  // Change this to true to see debugging info.
  // Useful if you have issues resolving modules
  debug: false,
  // all the file extensions used for imports other than 'ts', 'tsx', 'js', 'jsx', 'json'
  extensions: [],
  watchFolders: [],
})
