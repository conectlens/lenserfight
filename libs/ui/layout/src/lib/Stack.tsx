import React from 'react'

export interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: 'vertical' | 'horizontal'
  /** Tailwind gap class, e.g. 'gap-4' */
  gap?: string
  align?: 'start' | 'center' | 'end' | 'stretch'
  justify?: 'start' | 'center' | 'end' | 'between' | 'around'
  wrap?: boolean
  as?: React.ElementType
}

const alignClasses = {
  start:   'items-start',
  center:  'items-center',
  end:     'items-end',
  stretch: 'items-stretch',
}

const justifyClasses = {
  start:   'justify-start',
  center:  'justify-center',
  end:     'justify-end',
  between: 'justify-between',
  around:  'justify-around',
}

/**
 * Flexbox layout primitive. Handles vertical/horizontal spacing with token-driven gaps.
 *
 * @example
 * <Stack gap="gap-4">
 *   <Card />
 *   <Card />
 * </Stack>
 *
 * <Stack direction="horizontal" gap="gap-2" align="center">
 *   <Avatar />
 *   <Text>Username</Text>
 * </Stack>
 */
export const Stack = React.forwardRef<HTMLDivElement, StackProps>(
  (
    {
      direction = 'vertical',
      gap = 'gap-4',
      align = 'stretch',
      justify = 'start',
      wrap = false,
      as: As = 'div',
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    return (
      <As
        ref={ref}
        className={`
          flex
          ${direction === 'vertical' ? 'flex-col' : 'flex-row'}
          ${gap}
          ${alignClasses[align]}
          ${justifyClasses[justify]}
          ${wrap ? 'flex-wrap' : ''}
          ${className}
        `}
        {...props}
      >
        {children}
      </As>
    )
  }
)

Stack.displayName = 'Stack'
