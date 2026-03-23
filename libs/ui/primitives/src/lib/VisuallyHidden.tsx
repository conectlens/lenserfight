import React from 'react'

export interface VisuallyHiddenProps {
  children: React.ReactNode
  as?: React.ElementType
}

/**
 * Visually hides content while keeping it accessible to screen readers.
 * Use for accessible labels, descriptions, and off-screen announcements.
 *
 * @example
 * <button>
 *   <Icon name="close" aria-hidden />
 *   <VisuallyHidden>Close dialog</VisuallyHidden>
 * </button>
 */
export const VisuallyHidden: React.FC<VisuallyHiddenProps> = ({
  children,
  as: As = 'span',
}) => {
  return <As className="sr-only">{children}</As>
}

VisuallyHidden.displayName = 'VisuallyHidden'
