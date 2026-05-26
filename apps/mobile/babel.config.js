/**
 * Babel config for apps/mobile.
 *
 * babel-preset-expo handles:
 * - @babel/preset-react + @babel/preset-typescript
 * - @babel/plugin-transform-flow-strip-types  (strips Flow "import typeof" in react-native)
 * - React Native module transforms and dead-code elimination
 *
 * This file is detected by jest-expo's resolveBabelConfig so Jest uses it
 * instead of falling back to babel-preset-expo directly.
 */
module.exports = {
  presets: [require.resolve('babel-preset-expo')],
}
