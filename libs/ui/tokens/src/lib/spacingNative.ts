/**
 * ConnectLens Spacing Tokens — React Native
 *
 * Numeric pixel values for use in React Native StyleSheet.
 * Based on the 4px grid from spacing.ts.
 */

export const spacingN = {
  0:   0,
  0.5: 2,
  1:   4,
  1.5: 6,
  2:   8,
  2.5: 10,
  3:   12,
  3.5: 14,
  4:   16,
  5:   20,
  6:   24,
  7:   28,
  8:   32,
  9:   36,
  10:  40,
  12:  48,
  14:  56,
  16:  64,
  18:  72,
  20:  80,
  24:  96,
} as const

export const radiusN = {
  none: 0,
  sm:   4,
  md:   8,
  lg:   12,
  xl:   16,
  '2xl': 24,
  full: 9999,
} as const

/** Convert Tailwind gap class string to a numeric pixel value.
 *  e.g. 'gap-4' → 16, 'gap-2' → 8, 4 → 4 */
export function gapN(gap: number | string | undefined): number {
  if (typeof gap === 'number') return gap
  if (!gap) return 0
  const match = String(gap).match(/gap-(\d+(?:\.\d+)?)/)
  if (match) {
    const n = parseFloat(match[1])
    return n * 4
  }
  return 0
}
