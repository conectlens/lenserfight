/**
 * ConectLens Brand Color Tokens
 *
 * Five palettes: Primary Yellow, Deep Lens Navy, Greyscale, Primary Dark, Status.
 * Each palette is a plain `const` object so values are narrowed to string literals
 * and can be used in TypeScript without a type cast.
 *
 * In Tailwind 4 apps, register these as CSS custom properties inside `@theme {}`:
 *   --color-primary-yellow-500: #ffde59;
 * which auto-creates utilities like `bg-primary-yellow-500`.
 */

/** Primary Yellow — brand highlight / primary actions */
export const colorPrimaryYellow = {
  50: '#fff7d7',
  100: '#ffefb0',
  200: '#ffe784',
  300: '#ffdf63',
  400: '#ffda59',
  500: '#ffde59', // canonical --color-primary
  600: '#e8c645',
  700: '#c9a935',
  800: '#a88d2b',
  900: '#8a7322',
} as const

/** Deep Lens Navy — primary text, dark backgrounds */
export const colorDeepLensNavy = {
  50: '#e6edf5',
  100: '#c3d1e4',
  200: '#9ab4d2',
  300: '#6b94be',
  400: '#3c74a9',
  500: '#213f74', // canonical --color-deep
  600: '#1a3260',
  700: '#12244a',
  800: '#0a1730',
  900: '#040b14',
} as const

/** Greyscale — neutral text, borders, surfaces */
export const colorGreyscale = {
  0: '#ffffff',
  25: '#f8f9fa',
  50: '#f3f4f5',
  100: '#e6e7e9',
  200: '#dcdde0',
  300: '#c8c9cc',
  400: '#a6a7aa',
  500: '#86878a',
  600: '#6a6b6e',
  700: '#4e5053',
  800: '#333538',
  900: '#1f2022',
} as const

/** Primary Dark — dark mode backgrounds */
export const colorPrimaryDark = {
  500: '#1a1a1a',
  600: '#141414',
  700: '#0f0f0f',
  800: '#0a0a0a',
  900: '#000000',
} as const

/** Status — alerts, validation, informational states */
export const colorStatus = {
  green: '#2eb773',
  red: '#ea3942',
  blue: '#287bff',
  purple: '#8746ff',
} as const

/** All palettes as a single namespace for convenience */
export const colors = {
  primaryYellow: colorPrimaryYellow,
  deepLensNavy: colorDeepLensNavy,
  greyscale: colorGreyscale,
  primaryDark: colorPrimaryDark,
  status: colorStatus,
} as const
