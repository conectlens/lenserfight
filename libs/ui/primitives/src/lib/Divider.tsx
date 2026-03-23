import React from 'react'

export interface DividerProps extends React.HTMLAttributes<HTMLHRElement> {
  orientation?: 'horizontal' | 'vertical'
  /** Tailwind spacing class for margin, e.g. 'my-4' */
  spacing?: string
}

/**
 * Semantic separator. Uses the surface-border token for consistent color.
 *
 * @example
 * <Divider />
 * <Divider orientation="vertical" className="h-6" />
 */
export const Divider: React.FC<DividerProps> = ({
  orientation = 'horizontal',
  spacing = '',
  className = '',
  ...props
}) => {
  if (orientation === 'vertical') {
    return (
      <span
        role="separator"
        aria-orientation="vertical"
        className={`inline-block w-px self-stretch bg-surface-border ${spacing} ${className}`}
        {...(props as React.HTMLAttributes<HTMLSpanElement>)}
      />
    )
  }

  return (
    <hr
      className={`border-0 border-t border-surface-border ${spacing} ${className}`}
      {...props}
    />
  )
}

Divider.displayName = 'Divider'
