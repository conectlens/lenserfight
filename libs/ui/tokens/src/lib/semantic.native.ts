/**
 * ConnectLens Semantic Token Layer — React Native
 *
 * Raw hex color values for use in React Native StyleSheet.
 * Source of truth: tokens.css :root (light) and html.dark (dark) blocks.
 *
 * Do NOT use CSS var() references here — they are not supported in RN StyleSheet.
 * Use resolveNativeSurface() from nativeTheme.ts to get the correct color scheme object.
 */

export const semanticNativeSurfaceLight = {
  base:         '#ffffff',
  raised:       '#f8f9fa',
  overlay:      '#f3f4f5',
  sunken:       '#e6e7e9',
  interactive:  '#dcdde0',
  border:       '#dcdde0',
  borderSubtle: '#e6e7e9',
  text:         '#1f2022',
  textMuted:    '#6a6b6e',
  textDisabled: '#a6a7aa',
} as const

export const semanticNativeSurfaceDark = {
  base:         '#1a1a1a',
  raised:       '#141414',
  overlay:      '#222222',
  sunken:       '#111111',
  interactive:  '#2a2a2a',
  border:       '#333333',
  borderSubtle: '#252525',
  text:         '#f8f9fa',
  textMuted:    '#86878a',
  textDisabled: '#4e5053',
} as const

/** Brand colors — raw hex, platform-agnostic */
export const nativeColors = {
  primaryYellow: '#ffde59',
  primaryNavy:   '#213f74',
  navyLight:     '#3c74a9',
  statusGreen:   '#2eb773',
  statusRed:     '#ea3942',
  statusBlue:    '#287bff',
  statusPurple:  '#8746ff',
  white:         '#ffffff',
  black:         '#000000',
} as const

/** Semantic status colors — shared between light and dark */
export const semanticNativeStatus = {
  success: {
    bg:      '#2eb773',
    text:    '#ffffff',
    surface: 'rgba(46,183,115,0.1)',
  },
  error: {
    bg:      '#ea3942',
    text:    '#ffffff',
    surface: 'rgba(234,57,66,0.1)',
  },
  warning: {
    bg:      '#e8c645',
    text:    '#000000',
    surface: 'rgba(255,222,89,0.15)',
  },
  info: {
    bg:      '#287bff',
    text:    '#ffffff',
    surface: 'rgba(40,123,255,0.1)',
  },
} as const

export type NativeSurface = typeof semanticNativeSurfaceLight
export type NativeStatus  = typeof semanticNativeStatus
