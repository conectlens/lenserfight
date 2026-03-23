import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

export interface PortalProps {
  children: React.ReactNode
  /** Target container element — defaults to document.body */
  container?: Element | null
}

/**
 * Renders children into a DOM node outside the current component tree.
 * Required for overlays that must escape stacking contexts.
 *
 * @example
 * <Portal>
 *   <div className="fixed inset-0 z-modal">Overlay content</div>
 * </Portal>
 */
export const Portal: React.FC<PortalProps> = ({ children, container }) => {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  if (!mounted) return null

  const target = container ?? document.body
  return createPortal(children, target)
}

Portal.displayName = 'Portal'
