/**
 * ConnectLens Elevation Tokens — React Native
 *
 * Decomposes the Neumorphic CSS dual-shadow pairs into React Native shadow props.
 *
 * iOS:    shadowColor + shadowOffset + shadowOpacity + shadowRadius (one shadow per View)
 *         Neumorphic dual-shadow requires a 3-View stack — see Surface.native.tsx.
 * Android: `elevation` integer (system-controlled shadow; no highlight layer possible).
 *
 * Inset variants approximate the concave effect by reversing the offset direction.
 */

export type NativeElevationLevel      = 0 | 1 | 2 | 3 | 4 | 5
export type NativeInsetElevationLevel = 1 | 2 | 3

export interface IosShadowSpec {
  color:   string
  offset:  { width: number; height: number }
  opacity: number
  radius:  number
}

export interface NativeElevationSpec {
  /** Dark drop-shadow (lower-right on iOS) */
  iosShadow:    IosShadowSpec
  /** Light highlight (upper-left on iOS) — requires a second View layer */
  iosHighlight: IosShadowSpec
  /** Material elevation for Android (integer 0–24) */
  androidElevation: number
}

// ── Light mode ─────────────────────────────────────────────────────────────

export const nativeElevationLight: Record<NativeElevationLevel, NativeElevationSpec> = {
  0: {
    iosShadow:        { color: '#000000', offset: { width: 0, height: 0 }, opacity: 0, radius: 0 },
    iosHighlight:     { color: '#ffffff', offset: { width: 0, height: 0 }, opacity: 0, radius: 0 },
    androidElevation: 0,
  },
  1: {
    iosShadow:        { color: '#000000', offset: { width: 2, height: 2 }, opacity: 0.07, radius: 5 },
    iosHighlight:     { color: '#ffffff', offset: { width: -2, height: -2 }, opacity: 0.9, radius: 5 },
    androidElevation: 2,
  },
  2: {
    iosShadow:        { color: '#000000', offset: { width: 4, height: 4 }, opacity: 0.09, radius: 10 },
    iosHighlight:     { color: '#ffffff', offset: { width: -4, height: -4 }, opacity: 0.9, radius: 10 },
    androidElevation: 4,
  },
  3: {
    iosShadow:        { color: '#000000', offset: { width: 6, height: 6 }, opacity: 0.11, radius: 16 },
    iosHighlight:     { color: '#ffffff', offset: { width: -6, height: -6 }, opacity: 0.85, radius: 16 },
    androidElevation: 8,
  },
  4: {
    iosShadow:        { color: '#000000', offset: { width: 8, height: 8 }, opacity: 0.13, radius: 22 },
    iosHighlight:     { color: '#ffffff', offset: { width: -8, height: -8 }, opacity: 0.80, radius: 22 },
    androidElevation: 12,
  },
  5: {
    iosShadow:        { color: '#000000', offset: { width: 12, height: 12 }, opacity: 0.15, radius: 30 },
    iosHighlight:     { color: '#ffffff', offset: { width: -12, height: -12 }, opacity: 0.75, radius: 30 },
    androidElevation: 18,
  },
} as const

// ── Dark mode ───────────────────────────────────────────────────────────────

export const nativeElevationDark: Record<NativeElevationLevel, NativeElevationSpec> = {
  0: {
    iosShadow:        { color: '#000000', offset: { width: 0, height: 0 }, opacity: 0, radius: 0 },
    iosHighlight:     { color: '#ffffff', offset: { width: 0, height: 0 }, opacity: 0, radius: 0 },
    androidElevation: 0,
  },
  1: {
    iosShadow:        { color: '#000000', offset: { width: 2, height: 2 }, opacity: 0.4, radius: 5 },
    iosHighlight:     { color: '#ffffff', offset: { width: -2, height: -2 }, opacity: 0.04, radius: 5 },
    androidElevation: 2,
  },
  2: {
    iosShadow:        { color: '#000000', offset: { width: 4, height: 4 }, opacity: 0.5, radius: 10 },
    iosHighlight:     { color: '#ffffff', offset: { width: -4, height: -4 }, opacity: 0.05, radius: 10 },
    androidElevation: 4,
  },
  3: {
    iosShadow:        { color: '#000000', offset: { width: 6, height: 6 }, opacity: 0.6, radius: 16 },
    iosHighlight:     { color: '#ffffff', offset: { width: -6, height: -6 }, opacity: 0.06, radius: 16 },
    androidElevation: 8,
  },
  4: {
    iosShadow:        { color: '#000000', offset: { width: 8, height: 8 }, opacity: 0.65, radius: 22 },
    iosHighlight:     { color: '#ffffff', offset: { width: -8, height: -8 }, opacity: 0.06, radius: 22 },
    androidElevation: 12,
  },
  5: {
    iosShadow:        { color: '#000000', offset: { width: 12, height: 12 }, opacity: 0.7, radius: 30 },
    iosHighlight:     { color: '#ffffff', offset: { width: -12, height: -12 }, opacity: 0.05, radius: 30 },
    androidElevation: 18,
  },
} as const

// ── Inset (pressed) — light mode ────────────────────────────────────────────
// Reverse the offset direction to simulate a concave / pressed surface on iOS.

export const nativeElevationInsetLight: Record<NativeInsetElevationLevel, NativeElevationSpec> = {
  1: {
    iosShadow:        { color: '#000000', offset: { width: -2, height: -2 }, opacity: 0.07, radius: 5 },
    iosHighlight:     { color: '#ffffff', offset: { width: 2, height: 2 }, opacity: 0.9, radius: 5 },
    androidElevation: 0,
  },
  2: {
    iosShadow:        { color: '#000000', offset: { width: -4, height: -4 }, opacity: 0.09, radius: 10 },
    iosHighlight:     { color: '#ffffff', offset: { width: 4, height: 4 }, opacity: 0.9, radius: 10 },
    androidElevation: 0,
  },
  3: {
    iosShadow:        { color: '#000000', offset: { width: -6, height: -6 }, opacity: 0.11, radius: 16 },
    iosHighlight:     { color: '#ffffff', offset: { width: 6, height: 6 }, opacity: 0.85, radius: 16 },
    androidElevation: 0,
  },
} as const

// ── Inset (pressed) — dark mode ─────────────────────────────────────────────

export const nativeElevationInsetDark: Record<NativeInsetElevationLevel, NativeElevationSpec> = {
  1: {
    iosShadow:        { color: '#000000', offset: { width: -2, height: -2 }, opacity: 0.4, radius: 5 },
    iosHighlight:     { color: '#ffffff', offset: { width: 2, height: 2 }, opacity: 0.04, radius: 5 },
    androidElevation: 0,
  },
  2: {
    iosShadow:        { color: '#000000', offset: { width: -4, height: -4 }, opacity: 0.5, radius: 10 },
    iosHighlight:     { color: '#ffffff', offset: { width: 4, height: 4 }, opacity: 0.05, radius: 10 },
    androidElevation: 0,
  },
  3: {
    iosShadow:        { color: '#000000', offset: { width: -6, height: -6 }, opacity: 0.6, radius: 16 },
    iosHighlight:     { color: '#ffffff', offset: { width: 6, height: 6 }, opacity: 0.06, radius: 16 },
    androidElevation: 0,
  },
} as const

export const nativeElevation = {
  light:      nativeElevationLight,
  dark:       nativeElevationDark,
  insetLight: nativeElevationInsetLight,
  insetDark:  nativeElevationInsetDark,
} as const
