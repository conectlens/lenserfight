/**
 * FloatingActionButton.tsx — web stub (mobile-only component).
 *
 * On web, a FAB is rendered as a fixed-position button.
 * This stub provides a minimal web-compatible implementation.
 */
import React from 'react'

export interface FloatingActionButtonProps {
  onPress:    () => void
  icon:       React.ReactNode
  style?:     React.CSSProperties
  disabled?:  boolean
  accessibilityLabel: string
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onPress,
  icon,
  style,
  disabled,
  accessibilityLabel,
}) => (
  <button
    type="button"
    onClick={onPress}
    disabled={disabled}
    aria-label={accessibilityLabel}
    style={{
      position:        'fixed',
      bottom:          24,
      right:           24,
      width:           56,
      height:          56,
      borderRadius:    '50%',
      backgroundColor: '#213f74',
      border:          'none',
      cursor:          disabled ? 'not-allowed' : 'pointer',
      display:         'flex',
      alignItems:      'center',
      justifyContent:  'center',
      zIndex:          100,
      ...style,
    }}
  >
    {icon}
  </button>
)

FloatingActionButton.displayName = 'FloatingActionButton'
