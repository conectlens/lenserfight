import React from 'react'
import { Text, TextProps } from './Text'

export interface HeadingProps extends Omit<TextProps, 'variant'> {
  /** Semantic heading level (determines the HTML tag) */
  level?: 1 | 2 | 3 | 4 | 5 | 6
  /**
   * Visual size — defaults to match the semantic level.
   * Use when you need an h1 that looks like an h3, etc.
   */
  size?: 'display' | 'h1' | 'h2' | 'h3'
}

const levelToVariant: Record<number, 'display' | 'h1' | 'h2' | 'h3'> = {
  1: 'h1',
  2: 'h2',
  3: 'h3',
  4: 'h3',
  5: 'h3',
  6: 'h3',
}

/**
 * Semantic heading component. Uses Text under the hood.
 *
 * @example
 * <Heading level={2}>Section Title</Heading>
 * <Heading level={1} size="h2">Smaller Looking h1</Heading>
 */
export const Heading = React.forwardRef<HTMLHeadingElement, HeadingProps>(
  ({ level = 2, size, ...props }, ref) => {
    const variant = size ?? levelToVariant[level]
    const tag = `h${level}` as React.ElementType
    return <Text ref={ref as React.Ref<HTMLElement>} as={tag} variant={variant} {...props} />
  }
)

Heading.displayName = 'Heading'
