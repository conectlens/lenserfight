/**
 * Text.native.tsx — Typography primitive for React Native.
 *
 * Maps semantic variant names to token-derived TextStyle values.
 * Color defaults to the semantic surface text color from the current theme.
 */
import React from 'react'
import { Text as RNText, StyleSheet } from 'react-native'
import type { TextStyle, TextProps as RNTextProps } from 'react-native'
import { useNativeTheme } from '@lenserfight/ui/providers'
import { lineHeightN } from '@lenserfight/ui/tokens'

export type TextVariant =
  | 'display'
  | 'h1' | 'h2' | 'h3' | 'h4'
  | 'bodyL' | 'bodyM' | 'bodyS'
  | 'caption' | 'label'

export type TextColor = 'default' | 'muted' | 'disabled' | 'active' | 'inverse' | 'error' | 'success' | 'warning'

export interface TextProps extends Omit<RNTextProps, 'style'> {
  variant?: TextVariant
  color?:   TextColor
  weight?:  'regular' | 'medium' | 'semibold' | 'bold'
  align?:   TextStyle['textAlign']
  italic?:  boolean
  style?:   TextStyle
}

/**
 * Base text primitive. Compose into Heading, Label, Caption etc. at the feature layer.
 *
 * @example
 * <Text variant="bodyM" color="muted">Secondary information</Text>
 */
export const Text = React.forwardRef<RNText, TextProps>(
  (
    {
      variant = 'bodyM',
      color   = 'default',
      weight,
      align,
      italic,
      style,
      children,
      ...props
    },
    ref
  ) => {
    const { surface, fontSize, fontWeight, fontFamily, active, status } = useNativeTheme()

    const variantSizes: Record<TextVariant, [number, 'tight' | 'heading' | 'body']> = {
      display: [fontSize.display, 'tight'],
      h1:      [fontSize.h1,      'heading'],
      h2:      [fontSize.h2,      'heading'],
      h3:      [fontSize.h3,      'heading'],
      h4:      [fontSize.h4,      'heading'],
      bodyL:   [fontSize.bodyL,   'body'],
      bodyM:   [fontSize.bodyM,   'body'],
      bodyS:   [fontSize.bodyS,   'body'],
      caption: [fontSize.caption, 'body'],
      label:   [fontSize.label,   'body'],
    }

    const defaultWeights: Record<TextVariant, keyof typeof fontWeight> = {
      display: 'bold',
      h1: 'bold', h2: 'bold', h3: 'semibold', h4: 'semibold',
      bodyL: 'regular', bodyM: 'regular', bodyS: 'regular',
      caption: 'regular', label: 'medium',
    }

    const colorMap: Record<TextColor, string> = {
      default: surface.text,
      muted:   surface.textMuted,
      disabled:surface.textDisabled,
      active,
      inverse: surface.base,
      error:   status.error.bg,
      success: status.success.bg,
      warning: status.warning.bg,
    }

    const [sz, lhVariant] = variantSizes[variant]
    const resolvedWeight  = fontWeight[weight ?? defaultWeights[variant]]

    const textStyle: TextStyle = {
      fontFamily:  fontFamily.sans,
      fontSize:    sz,
      lineHeight:  lineHeightN(sz, lhVariant),
      fontWeight:  resolvedWeight,
      color:       colorMap[color],
      textAlign:   align,
      fontStyle:   italic ? 'italic' : 'normal',
    }

    return (
      <RNText ref={ref} style={[textStyle, style]} {...props}>
        {children}
      </RNText>
    )
  }
)

Text.displayName = 'Text'
