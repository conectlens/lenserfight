/**
 * ConectLens Typography Tokens — React Native
 *
 * Numeric values for React Native TextStyle.
 * Based on the type scale from typography.ts.
 *
 * Inter font must be loaded via expo-font before use.
 * Falls back to system font if not loaded.
 */
import type { TextStyle } from 'react-native'

export const fontFamilyN = {
  sans: 'Inter',
} as const

export const fontSizeN = {
  display: 60,
  h1: 36,
  h2: 28,
  h3: 22,
  h4: 18,
  bodyL: 18,
  bodyM: 16,
  bodyS: 14,
  caption: 12,
  label: 11,
} as const

export const fontWeightN: Record<string, TextStyle['fontWeight']> = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const

/** Line height multipliers → absolute line heights per font size */
export function lineHeightN(fontSize: number, variant: 'tight' | 'heading' | 'body' | 'relaxed' = 'body'): number {
  const multipliers = { tight: 1.1, heading: 1.25, body: 1.5, relaxed: 1.75 }
  return Math.round(fontSize * multipliers[variant])
}
