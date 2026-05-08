/**
 * ConectLens Breakpoint Tokens
 *
 * Min-width breakpoints for responsive design.
 * These mirror Tailwind's default breakpoints for consistency.
 * In Tailwind 4, register as --breakpoint-* inside @theme {}.
 */

export const breakpoints = {
  xs: '320px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const

export type BreakpointKey = keyof typeof breakpoints
