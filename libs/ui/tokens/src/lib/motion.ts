/**
 * ConnectLens Motion Tokens
 *
 * Duration and easing values for transitions and animations.
 * In Tailwind 4, register as --duration-* and --ease-* inside @theme {}.
 */

export const transitionDuration = {
  instant: '0ms',
  fast:    '100ms',
  normal:  '200ms',
  slow:    '300ms',
  xslow:   '500ms',
} as const

export const transitionEasing = {
  /** General-purpose easing — acceleration + deceleration */
  standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
  /** Entering elements — decelerating */
  enter:    'cubic-bezier(0, 0, 0.2, 1)',
  /** Exiting elements — accelerating */
  exit:     'cubic-bezier(0.4, 0, 1, 1)',
  /** Bouncy/spring feel for interactive feedback */
  spring:   'cubic-bezier(0.34, 1.56, 0.64, 1)',
} as const

export const motion = {
  transitionDuration,
  transitionEasing,
} as const
