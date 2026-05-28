import React from 'react'

export interface SpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  /** Accessible label for screen readers (default: "Loading") */
  label?: string
  className?: string
}

const sizeClasses: Record<NonNullable<SpinnerProps['size']>, string> = {
  xs: 'h-3 w-3 border-[2px]',
  sm: 'h-4 w-4 border-[2px]',
  md: 'h-6 w-6 border-[2px]',
  lg: 'h-8 w-8 border-[3px]',
  xl: 'h-12 w-12 border-[3px]',
}

/**
 * Loading spinner. Pure CSS, no external dependencies.
 *
 * @example
 * <Spinner size="md" label="Loading posts" />
 */
export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  label = 'Loading',
  className = '',
}) => {
  return (
    <span role="status" aria-label={label} className={`inline-flex ${className}`}>
      <span
        className={`
          ${sizeClasses[size]}
          animate-spin
          rounded-full
          border-greyscale-200
          border-t-deep-lens-navy-500
          dark:border-greyscale-700
          dark:border-t-primary-yellow-500
        `}
      />
      <span className="sr-only">{label}</span>
    </span>
  )
}

Spinner.displayName = 'Spinner'
