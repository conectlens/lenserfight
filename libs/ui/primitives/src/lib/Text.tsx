import React from 'react'

export type TextVariant =
  | 'display'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'body-l'
  | 'body-m'
  | 'bodyL'
  | 'bodyM'
  | 'bodyS'
  | 'caption'
  | 'label'

export interface TextProps extends React.HTMLAttributes<HTMLElement> {
  variant?: TextVariant
  as?: React.ElementType
  color?:
    | 'default'
    | 'muted'
    | 'disabled'
    | 'primary'
    | 'danger'
    | 'success'
    | 'error'
    | 'warning'
    | 'active'
    | 'inverse'
  /** Font weight (used on native; mapped to a Tailwind class on web). */
  weight?: 'regular' | 'medium' | 'semibold' | 'bold'
  /** Text alignment (used on native; mapped to a Tailwind class on web). */
  align?: 'left' | 'center' | 'right' | 'auto' | 'justify'
  italic?: boolean
  /** Native-only: truncate after N lines. Ignored on web (use CSS for line-clamp). */
  numberOfLines?: number
  // `style` on native is a TextStyle object; on web React.HTMLAttributes already
  // declares `style` so the union below stays compatible.
}

const variantClasses: Record<TextVariant, string> = {
  display: 'text-[60px] font-bold leading-tight tracking-tight',
  h1:      'text-4xl font-bold leading-heading',
  h2:      'text-[28px] font-semibold leading-heading',
  h3:      'text-[22px] font-semibold leading-snug',
  h4:      'text-lg font-semibold leading-snug',
  'body-l': 'text-lg font-normal leading-body',
  'body-m': 'text-base font-normal leading-body',
  bodyL:   'text-lg font-normal leading-body',
  bodyM:   'text-base font-normal leading-body',
  bodyS:   'text-sm font-normal leading-body',
  caption: 'text-sm font-normal leading-body',
  label:   'text-xs font-medium leading-body',
}

const colorClasses: Record<NonNullable<TextProps['color']>, string> = {
  default:  'text-greyscale-900 dark:text-greyscale-50',
  muted:    'text-greyscale-600 dark:text-greyscale-400',
  disabled: 'text-greyscale-400 dark:text-greyscale-600',
  primary:  'text-deep-lens-navy-500 dark:text-primary-yellow-400',
  danger:   'text-status-red',
  success:  'text-status-green',
  error:    'text-status-red',
  warning:  'text-status-yellow',
  active:   'text-primary-yellow-500',
  inverse:  'text-greyscale-50 dark:text-greyscale-900',
}

const variantDefaultTag: Record<TextVariant, React.ElementType> = {
  display:  'p',
  h1:       'h1',
  h2:       'h2',
  h3:       'h3',
  h4:       'h4',
  'body-l': 'p',
  'body-m': 'p',
  bodyL:    'p',
  bodyM:    'p',
  bodyS:    'p',
  caption:  'span',
  label:    'span',
}

/**
 * Typography primitive. All text in the application should use this component
 * to ensure consistent font sizing, weight, and color tokens.
 *
 * @example
 * <Text variant="h2">Section Title</Text>
 * <Text variant="body-m" color="muted">Helper description</Text>
 */
const weightClasses: Record<NonNullable<TextProps['weight']>, string> = {
  regular:  'font-normal',
  medium:   'font-medium',
  semibold: 'font-semibold',
  bold:     'font-bold',
}

const alignClasses: Record<NonNullable<TextProps['align']>, string> = {
  left:    'text-left',
  center:  'text-center',
  right:   'text-right',
  auto:    '',
  justify: 'text-justify',
}

export const Text = React.forwardRef<HTMLElement, TextProps>(
  (
    {
      variant = 'body-m',
      color = 'default',
      as,
      weight,
      align,
      italic,
      numberOfLines: _numberOfLines,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const As = as ?? variantDefaultTag[variant]
    const weightCls = weight ? ` ${weightClasses[weight]}` : ''
    const alignCls  = align ? ` ${alignClasses[align]}` : ''
    const italicCls = italic ? ' italic' : ''
    return (
      <As
        ref={ref}
        className={`${variantClasses[variant]} ${colorClasses[color]}${weightCls}${alignCls}${italicCls} ${className}`}
        {...props}
      >
        {children}
      </As>
    )
  }
)

Text.displayName = 'Text'
