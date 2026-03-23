import React from 'react'

export type TextVariant =
  | 'display'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'body-l'
  | 'body-m'
  | 'caption'

export interface TextProps extends React.HTMLAttributes<HTMLElement> {
  variant?: TextVariant
  as?: React.ElementType
  color?: 'default' | 'muted' | 'disabled' | 'primary' | 'danger' | 'success'
}

const variantClasses: Record<TextVariant, string> = {
  display: 'text-[60px] font-bold leading-tight tracking-tight',
  h1:      'text-4xl font-bold leading-heading',
  h2:      'text-[28px] font-semibold leading-heading',
  h3:      'text-[22px] font-semibold leading-snug',
  'body-l': 'text-lg font-normal leading-body',
  'body-m': 'text-base font-normal leading-body',
  caption: 'text-sm font-normal leading-body',
}

const colorClasses: Record<NonNullable<TextProps['color']>, string> = {
  default:  'text-greyscale-900 dark:text-greyscale-50',
  muted:    'text-greyscale-600 dark:text-greyscale-400',
  disabled: 'text-greyscale-400 dark:text-greyscale-600',
  primary:  'text-deep-lens-navy-500 dark:text-primary-yellow-400',
  danger:   'text-status-red',
  success:  'text-status-green',
}

const variantDefaultTag: Record<TextVariant, React.ElementType> = {
  display:  'p',
  h1:       'h1',
  h2:       'h2',
  h3:       'h3',
  'body-l': 'p',
  'body-m': 'p',
  caption:  'span',
}

/**
 * Typography primitive. All text in the application should use this component
 * to ensure consistent font sizing, weight, and color tokens.
 *
 * @example
 * <Text variant="h2">Section Title</Text>
 * <Text variant="body-m" color="muted">Helper description</Text>
 */
export const Text = React.forwardRef<HTMLElement, TextProps>(
  ({ variant = 'body-m', color = 'default', as, className = '', children, ...props }, ref) => {
    const As = as ?? variantDefaultTag[variant]
    return (
      <As
        ref={ref}
        className={`${variantClasses[variant]} ${colorClasses[color]} ${className}`}
        {...props}
      >
        {children}
      </As>
    )
  }
)

Text.displayName = 'Text'
