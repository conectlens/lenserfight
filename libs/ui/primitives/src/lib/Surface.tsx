import React from 'react'

export type SurfaceVariant = 'raised' | 'flat' | 'inset'

export interface SurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Controls the neumorphic shadow style:
   * - `raised` — extruded, floating appearance (default)
   * - `flat`   — no shadow, transparent to parent surface
   * - `inset`  — pressed/concave appearance
   */
  variant?: SurfaceVariant
  as?: React.ElementType
}

const variantClasses: Record<SurfaceVariant, string> = {
  raised: 'shadow-neu-2 bg-surface-raised',
  flat:   'shadow-none bg-transparent',
  inset:  'shadow-neu-inset-2 bg-surface-sunken',
}

/**
 * Base neumorphic surface container.
 * All visual cards, panels, and containers should be built on top of Surface.
 *
 * @example
 * <Surface variant="raised" className="rounded-2xl p-6">
 *   Card content
 * </Surface>
 */
export const Surface = React.forwardRef<HTMLDivElement, SurfaceProps>(
  ({ variant = 'raised', as: As = 'div', className = '', children, ...props }, ref) => {
    return (
      <As
        ref={ref}
        className={`${variantClasses[variant]} transition-shadow duration-normal ease-standard ${className}`}
        {...props}
      >
        {children}
      </As>
    )
  }
)

Surface.displayName = 'Surface'
