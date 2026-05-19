import React from 'react'
import { Logo } from './Logo'

export interface LenserFightBadgeProps {
  /** Size passed to the Logo mark. Defaults to 18. */
  logoSize?: number
  /** Show the "LenserFight" wordmark. Defaults to true. */
  showWordmark?: boolean
  /** Additional classes for the outer wrapper. */
  className?: string
}

/**
 * Positioned brand badge — renders `Logo` with the Beta pill, anchored
 * `absolute bottom-2 right-2` inside its nearest `relative` container.
 */
export const LenserFightBadge: React.FC<LenserFightBadgeProps> = ({
  logoSize = 18,
  showWordmark = true,
  className = '',
}) => {
  return (
    <span
      className={`absolute bottom-2 right-2 z-10 inline-flex items-center gap-1.5
        rounded-full px-2.5 py-1
        bg-primary-yellow-500 dark:bg-deep-lens-navy-700
        border border-primary-yellow-600/30 dark:border-deep-lens-navy-500/40
        shadow-sm select-none pointer-events-none
        ${className}`}
    >
      <Logo size={logoSize} showWordmark={showWordmark} showBeta />
    </span>
  )
}

LenserFightBadge.displayName = 'LenserFightBadge'
