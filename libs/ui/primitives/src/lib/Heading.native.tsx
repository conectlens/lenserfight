/**
 * Heading.native.tsx — Heading wrapper over Text.native.tsx.
 */
import React from 'react'
import type { TextStyle } from 'react-native'
import { Text, type TextProps } from './Text.native'

export type HeadingLevel = 1 | 2 | 3 | 4

export interface HeadingProps extends Omit<TextProps, 'variant'> {
  level?: HeadingLevel
}

const levelVariantMap = {
  1: 'h1',
  2: 'h2',
  3: 'h3',
  4: 'h4',
} as const

/**
 * Semantic heading with automatic variant mapping.
 *
 * @example
 * <Heading level={2}>Arena</Heading>
 */
export const Heading = React.forwardRef<any, HeadingProps>(
  ({ level = 2, ...props }, ref) => {
    return (
      <Text
        ref={ref}
        variant={levelVariantMap[level]}
        accessibilityRole="header"
        {...props}
      />
    )
  }
)

Heading.displayName = 'Heading'
