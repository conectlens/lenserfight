/**
 * Spinner.native.tsx — Loading spinner for React Native.
 *
 * Uses Animated.loop + rotate transform. No external dependencies.
 * Mimics the CSS border-top-color trick: a bordered circle with one arc colored.
 */
import React, { useEffect, useRef } from 'react'
import { Animated, StyleSheet, Easing } from 'react-native'
import { useNativeTheme } from '@lenserfight/ui/providers'

export type SpinnerSize = 'sm' | 'md' | 'lg'
export type SpinnerVariant = 'default' | 'primary' | 'muted'

export interface SpinnerProps {
  size?:    SpinnerSize
  variant?: SpinnerVariant
  /** Accessible label for screen readers */
  label?:   string
}

const sizeMap: Record<SpinnerSize, number> = {
  sm: 16,
  md: 24,
  lg: 36,
}

/**
 * Indeterminate loading spinner using a rotating bordered circle.
 *
 * @example
 * <Spinner size="md" />
 */
export const Spinner: React.FC<SpinnerProps> = ({
  size    = 'md',
  variant = 'default',
  label   = 'Loading',
}) => {
  const { surface, active } = useNativeTheme()
  const spin = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.loop(
      Animated.timing(spin, {
        toValue:         1,
        duration:        700,
        easing:          Easing.linear,
        useNativeDriver: true,
      })
    ).start()
  }, [spin])

  const rotate = spin.interpolate({
    inputRange:  [0, 1],
    outputRange: ['0deg', '360deg'],
  })

  const diameter = sizeMap[size]
  const borderW  = size === 'sm' ? 2 : 3

  const trackColor: Record<SpinnerVariant, string> = {
    default: active,
    primary: active,
    muted:   surface.border,
  }
  const arcColor = trackColor[variant]
  const baseColor = surface.border

  return (
    <Animated.View
      style={[
        styles.circle,
        {
          width:             diameter,
          height:            diameter,
          borderRadius:      diameter / 2,
          borderWidth:       borderW,
          borderColor:       baseColor,
          borderTopColor:    arcColor,
          transform:         [{ rotate }],
        },
      ]}
      accessible
      accessibilityLabel={label}
      accessibilityRole="progressbar"
    />
  )
}

Spinner.displayName = 'Spinner'

const styles = StyleSheet.create({
  circle: {
    alignSelf: 'center',
  },
})
