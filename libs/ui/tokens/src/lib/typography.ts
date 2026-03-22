/**
 * ConnectLens Typography Tokens
 *
 * Based on Inter typeface with a 7-level type scale.
 */

export const fontFamily = {
  sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
} as const

/** Type scale — pixel values as strings for direct CSS use */
export const fontSize = {
  display: '60px',
  h1: '36px',
  h2: '28px',
  h3: '22px',
  bodyL: '18px',
  bodyM: '16px',
  caption: '14px',
} as const

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const

export const lineHeight = {
  tight: '1.1',
  heading: '1.25',
  body: '1.5',
} as const

/** Combined typography tokens */
export const typography = {
  fontFamily,
  fontSize,
  fontWeight,
  lineHeight,
} as const
