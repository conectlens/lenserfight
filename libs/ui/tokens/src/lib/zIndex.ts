/**
 * ConnectLens Z-Index Stack Tokens
 *
 * Named stacking layers for the application. Higher values render on top.
 * In Tailwind 4, register as --z-* inside @theme {} to generate z-* utilities.
 */

export const zIndex = {
  base:     0,
  raised:   10,
  dropdown: 100,
  sticky:   200,
  overlay:  300,
  modal:    400,
  toast:    500,
  tooltip:  600,
} as const

export type ZIndexKey = keyof typeof zIndex
