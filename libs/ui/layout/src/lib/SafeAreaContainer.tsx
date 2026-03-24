/**
 * SafeAreaContainer.tsx — web stub (mobile-only component).
 *
 * On web, safe area is handled via CSS env() variables.
 * This stub renders a plain div wrapper.
 */
import React from 'react'

export interface SafeAreaContainerProps {
  children:   React.ReactNode
  edges?:     ('top' | 'bottom' | 'left' | 'right')[]
  style?:     React.CSSProperties
  testID?:    string
}

export const SafeAreaContainer: React.FC<SafeAreaContainerProps> = ({
  children,
  style,
}) => (
  <div style={{ display: 'flex', flexDirection: 'column', flex: 1, ...style }}>
    {children}
  </div>
)

SafeAreaContainer.displayName = 'SafeAreaContainer'
