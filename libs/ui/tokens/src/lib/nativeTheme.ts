/**
 * ConectLens Native Theme Utilities
 *
 * Pure (non-React) resolver functions that map a color scheme to
 * the correct token objects. Consumed by NativeThemeContext.tsx.
 */

import {
  semanticNativeSurfaceLight,
  semanticNativeSurfaceDark,
  semanticNativeStatus,
  nativeColors,
  type NativeSurface,
  type NativeStatus,
} from './semantic.native'
import {
  nativeElevationLight,
  nativeElevationDark,
  nativeElevationInsetLight,
  nativeElevationInsetDark,
  type NativeElevationLevel,
  type NativeInsetElevationLevel,
  type NativeElevationSpec,
} from './elevation.native'
import { spacingN, radiusN, gapN } from './spacingNative'
import { fontSizeN, fontWeightN, fontFamilyN, lineHeightN } from './typographyNative'

export type ColorScheme = 'light' | 'dark'

export interface NativeThemeTokens {
  colorScheme: ColorScheme
  surface: NativeSurface
  status: NativeStatus
  colors: typeof nativeColors
  spacing: typeof spacingN
  radius: typeof radiusN
  fontSize: typeof fontSizeN
  fontWeight: typeof fontWeightN
  fontFamily: typeof fontFamilyN
  lineHeight: typeof lineHeightN
  elevation: (level: NativeElevationLevel) => NativeElevationSpec
  elevationInset: (level: NativeInsetElevationLevel) => NativeElevationSpec
  gapN: typeof gapN
  /** Active color — navy in light mode, yellow in dark mode */
  active: string
}

export function resolveNativeTheme(colorScheme: ColorScheme): NativeThemeTokens {
  const isLight = colorScheme === 'light'
  const elevMap = isLight ? nativeElevationLight : nativeElevationDark
  const insetMap = isLight ? nativeElevationInsetLight : nativeElevationInsetDark

  return {
    colorScheme,
    surface: isLight ? semanticNativeSurfaceLight : semanticNativeSurfaceDark,
    status: semanticNativeStatus,
    colors: nativeColors,
    spacing: spacingN,
    radius: radiusN,
    fontSize: fontSizeN,
    fontWeight: fontWeightN,
    fontFamily: fontFamilyN,
    lineHeight: lineHeightN,
    elevation: (level) => elevMap[level],
    elevationInset: (level) => insetMap[level],
    gapN,
    active: isLight ? nativeColors.primaryNavy : nativeColors.primaryYellow,
  }
}
