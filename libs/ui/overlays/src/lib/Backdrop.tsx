import React from 'react'

export interface BackdropProps extends React.HTMLAttributes<HTMLDivElement> {
  visible?: boolean
  onDismiss?: () => void
  blur?: boolean
}

/**
 * Semi-transparent backdrop for modals, drawers, and sheets.
 * Clicking it triggers onDismiss.
 *
 * @example
 * <Backdrop visible={isOpen} onDismiss={close} blur />
 */
export const Backdrop: React.FC<BackdropProps> = ({
  visible = true,
  onDismiss,
  blur = false,
  className = '',
  ...props
}) => {
  if (!visible) return null

  return (
    <div
      aria-hidden="true"
      className={`
        fixed inset-0
        bg-black/40
        ${blur ? 'backdrop-blur-sm' : ''}
        transition-opacity duration-normal ease-standard
        ${className}
      `}
      onClick={onDismiss}
      {...props}
    />
  )
}

Backdrop.displayName = 'Backdrop'
