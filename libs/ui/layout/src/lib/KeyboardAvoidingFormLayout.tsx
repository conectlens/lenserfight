/**
 * KeyboardAvoidingFormLayout.tsx — web stub (mobile-only component).
 *
 * On web, keyboard avoidance is not required. This stub renders a plain wrapper.
 */
import React from 'react'

export interface KeyboardAvoidingFormLayoutProps {
  children:          React.ReactNode
  scrollable?:       boolean
  style?:            React.CSSProperties
  contentStyle?:     React.CSSProperties
  keyboardVerticalOffset?: number
}

export const KeyboardAvoidingFormLayout: React.FC<KeyboardAvoidingFormLayoutProps> = ({
  children,
  style,
}) => (
  <div style={{ display: 'flex', flexDirection: 'column', flex: 1, ...style }}>
    {children}
  </div>
)

KeyboardAvoidingFormLayout.displayName = 'KeyboardAvoidingFormLayout'
