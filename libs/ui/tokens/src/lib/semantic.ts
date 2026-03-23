/**
 * ConnectLens Semantic Token Layer
 *
 * Maps design roles (surface, text, border) to the raw CSS custom properties
 * defined in tokens.css. These references resolve at runtime via the :root and
 * html.dark overrides, providing automatic light/dark switching.
 *
 * Use these as the single source of truth for component styling:
 *   background: var(--cl-surface-raised)   — instead of hardcoded #f8f9fa
 */

/** Semantic surface color roles */
export const semanticSurface = {
  light: {
    base:         'var(--cl-surface-base)',
    raised:       'var(--cl-surface-raised)',
    overlay:      'var(--cl-surface-overlay)',
    sunken:       'var(--cl-surface-sunken)',
    interactive:  'var(--cl-surface-interactive)',
    border:       'var(--cl-surface-border)',
    borderSubtle: 'var(--cl-surface-border-subtle)',
    text:         'var(--cl-surface-text)',
    textMuted:    'var(--cl-surface-text-muted)',
    textDisabled: 'var(--cl-surface-text-disabled)',
  },
  dark: {
    base:         'var(--cl-surface-base)',
    raised:       'var(--cl-surface-raised)',
    overlay:      'var(--cl-surface-overlay)',
    sunken:       'var(--cl-surface-sunken)',
    interactive:  'var(--cl-surface-interactive)',
    border:       'var(--cl-surface-border)',
    borderSubtle: 'var(--cl-surface-border-subtle)',
    text:         'var(--cl-surface-text)',
    textMuted:    'var(--cl-surface-text-muted)',
    textDisabled: 'var(--cl-surface-text-disabled)',
  },
} as const

/** Semantic status color roles */
export const semanticStatus = {
  success: {
    bg:      'var(--cl-status-green)',
    text:    '#ffffff',
    surface: 'rgba(46,183,115,0.1)',
  },
  error: {
    bg:      'var(--cl-status-red)',
    text:    '#ffffff',
    surface: 'rgba(234,57,66,0.1)',
  },
  warning: {
    bg:      'var(--cl-yellow-600)',
    text:    '#000000',
    surface: 'rgba(255,222,89,0.15)',
  },
  info: {
    bg:      'var(--cl-status-blue)',
    text:    '#ffffff',
    surface: 'rgba(40,123,255,0.1)',
  },
} as const

export const semantic = {
  surface: semanticSurface,
  status:  semanticStatus,
} as const
