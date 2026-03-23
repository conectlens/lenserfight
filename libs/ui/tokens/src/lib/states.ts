/**
 * ConnectLens Interaction State Tokens
 *
 * Opacity multipliers for layering state indicators over component backgrounds.
 * Use as Tailwind opacity modifiers or as direct CSS `opacity` / `rgba` alpha values.
 */

export const stateOpacity = {
  /** Subtle hover highlight */
  hover:              '0.08',
  /** Pressed/active indicator */
  pressed:            '0.12',
  /** Keyboard-focus indicator */
  focused:            '0.12',
  /** Drag-in-progress indicator */
  dragged:            '0.16',
  /** Disabled foreground (text/icon) */
  disabled:           '0.38',
  /** Disabled container/background */
  disabledContainer:  '0.12',
} as const

/** Named Neumorphic surface state variants */
export const surfaceVariant = {
  raised:           'raised',
  flat:             'flat',
  inset:            'inset',
  interactiveHover: 'interactive-hover',
  interactivePress: 'interactive-press',
  focusVisible:     'focus-visible',
  disabled:         'disabled',
  success:          'success',
  warning:          'warning',
  danger:           'danger',
} as const

export type SurfaceVariant = typeof surfaceVariant[keyof typeof surfaceVariant]

export const states = {
  stateOpacity,
  surfaceVariant,
} as const
