/**
 * ConnectLens Elevation Tokens — Neumorphic Shadow Pairs
 *
 * Each level defines a PAIR of shadows:
 *   - highlight: light, upper-left offset (creates the raised appearance)
 *   - shadow:    dark, lower-right offset (creates depth)
 *
 * Inset variants reverse the direction to create a pressed/concave effect.
 *
 * In Tailwind 4 apps, register these as --shadow-neu-* inside @theme {}:
 *   --shadow-neu-1: var(--cl-elevation-1);
 * which auto-creates the utility class `shadow-neu-1`.
 */

export type ElevationLevel = 0 | 1 | 2 | 3 | 4 | 5
export type InsetElevationLevel = 1 | 2 | 3

/** Neumorphic raised shadow pairs — light mode */
export const elevationLight: Record<ElevationLevel, string> = {
  0: 'none',
  1: '2px 2px 5px rgba(0,0,0,0.07), -2px -2px 5px rgba(255,255,255,0.9)',
  2: '4px 4px 10px rgba(0,0,0,0.09), -4px -4px 10px rgba(255,255,255,0.9)',
  3: '6px 6px 16px rgba(0,0,0,0.11), -6px -6px 16px rgba(255,255,255,0.85)',
  4: '8px 8px 22px rgba(0,0,0,0.13), -8px -8px 22px rgba(255,255,255,0.8)',
  5: '12px 12px 30px rgba(0,0,0,0.15), -12px -12px 30px rgba(255,255,255,0.75)',
} as const

/** Neumorphic raised shadow pairs — dark mode */
export const elevationDark: Record<ElevationLevel, string> = {
  0: 'none',
  1: '2px 2px 5px rgba(0,0,0,0.4), -2px -2px 5px rgba(255,255,255,0.04)',
  2: '4px 4px 10px rgba(0,0,0,0.5), -4px -4px 10px rgba(255,255,255,0.05)',
  3: '6px 6px 16px rgba(0,0,0,0.6), -6px -6px 16px rgba(255,255,255,0.06)',
  4: '8px 8px 22px rgba(0,0,0,0.65), -8px -8px 22px rgba(255,255,255,0.06)',
  5: '12px 12px 30px rgba(0,0,0,0.7), -12px -12px 30px rgba(255,255,255,0.05)',
} as const

/** Neumorphic inset (pressed) shadow pairs — light mode */
export const elevationInsetLight: Record<InsetElevationLevel, string> = {
  1: 'inset 2px 2px 5px rgba(0,0,0,0.07), inset -2px -2px 5px rgba(255,255,255,0.9)',
  2: 'inset 4px 4px 10px rgba(0,0,0,0.09), inset -4px -4px 10px rgba(255,255,255,0.9)',
  3: 'inset 6px 6px 16px rgba(0,0,0,0.11), inset -6px -6px 16px rgba(255,255,255,0.85)',
} as const

/** Neumorphic inset (pressed) shadow pairs — dark mode */
export const elevationInsetDark: Record<InsetElevationLevel, string> = {
  1: 'inset 2px 2px 5px rgba(0,0,0,0.4), inset -2px -2px 5px rgba(255,255,255,0.04)',
  2: 'inset 4px 4px 10px rgba(0,0,0,0.5), inset -4px -4px 10px rgba(255,255,255,0.05)',
  3: 'inset 6px 6px 16px rgba(0,0,0,0.6), inset -6px -6px 16px rgba(255,255,255,0.06)',
} as const

export const elevation = {
  light: elevationLight,
  dark: elevationDark,
  insetLight: elevationInsetLight,
  insetDark: elevationInsetDark,
} as const
