const path = require('path')

// Absolute paths ensure both Expo config (reads app.config.js from apps/mobile/)
// and Metro asset server (projectRoot = workspace root) resolve assets correctly.
const assets = (rel) => path.resolve(__dirname, rel)

/** @type {import('expo/config').ExpoConfig} */
module.exports = {
  name: 'Mobile',
  slug: 'mobile',
  version: '1.0.0',
  platforms: ['ios', 'android'],
  orientation: 'portrait',
  icon: assets('assets/mobile/apple-icon.png'),
  scheme: 'lenserfight',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
  },
  android: {
    adaptiveIcon: {
      foregroundImage: assets('assets/mobile/android-icon-192x192.png'),
      backgroundColor: '#ffffff',
    },
    edgeToEdgeEnabled: true,
  },
  plugins: [
    // root must be absolute — @nx/expo sets Metro projectRoot to the workspace
    // root, but @expo/cli passes routerRoot to Babel which joins it with that
    // projectRoot. A relative 'src/app' resolves to <workspace>/src/app (wrong).
    ['expo-router', { root: path.resolve(__dirname, 'src/app') }],
    [
      'expo-splash-screen',
      {
        image: assets('assets/mobile/apple-icon.png'),
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: '#ffffff',
      },
    ],
  ],
}
