import React from 'react'
import { Pressable, PressableProps } from './Pressable'

export interface IconButtonProps extends Omit<PressableProps, 'children'> {
  icon: React.ReactNode
  /** Accessible label — required for icon-only buttons */
  'aria-label': string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  variant?: 'ghost' | 'surface' | 'outline'
  tooltip?: string
}

const sizeClasses = {
  xs: 'h-6 w-6',
  sm: 'h-8 w-8',
  md: 'h-9 w-9',
  lg: 'h-10 w-10',
}

const variantClasses = {
  ghost:   'bg-transparent hover:bg-greyscale-100 dark:hover:bg-greyscale-800',
  surface: 'shadow-neu-1 bg-surface-raised hover:shadow-neu-2',
  outline: 'border border-surface-border bg-transparent hover:bg-greyscale-50 dark:hover:bg-greyscale-800',
}

/**
 * Icon-only button with accessible label.
 *
 * @example
 * <IconButton icon={<XIcon />} aria-label="Close" onPress={onClose} />
 * <IconButton icon={<HeartIcon />} aria-label="Like" variant="surface" size="sm" />
 */
export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, size = 'md', variant = 'ghost', className = '', ...props }, ref) => {
    return (
      <Pressable
        ref={ref}
        className={`
          rounded-lg
          ${sizeClasses[size]}
          ${variantClasses[variant]}
          transition-all duration-fast ease-standard
          ${className}
        `}
        {...props}
      >
        {icon}
      </Pressable>
    )
  }
)

IconButton.displayName = 'IconButton'
