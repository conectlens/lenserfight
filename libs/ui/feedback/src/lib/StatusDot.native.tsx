/**
 * StatusDot.native.tsx — Status indicator dot for React Native.
 */
import React, { useEffect, useRef } from 'react'
import { Animated, StyleSheet } from 'react-native'

export type StatusDotVariant = 'online' | 'offline' | 'away' | 'busy' | 'neutral'

export interface StatusDotProps {
  variant?: StatusDotVariant
  size?:    number
  pulsing?: boolean
  label?:   string
}

const variantColors: Record<StatusDotVariant, string> = {
  online:  '#2eb773',
  offline: '#a6a7aa',
  away:    '#e8c645',
  busy:    '#ea3942',
  neutral: '#a6a7aa',
}

/**
 * @example
 * <StatusDot variant="online" pulsing />
 */
export const StatusDot: React.FC<StatusDotProps> = ({
  variant = 'neutral',
  size    = 10,
  pulsing,
  label,
}) => {
  const pulse = useRef(new Animated.Value(1)).current

  useEffect(() => {
    if (!pulsing) return
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.5, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,   duration: 800, useNativeDriver: true }),
      ])
    )
    anim.start()
    return () => anim.stop()
  }, [pulsing, pulse])

  const color = variantColors[variant]

  return (
    <Animated.View
      style={[
        styles.dot,
        {
          width:           size,
          height:          size,
          borderRadius:    size / 2,
          backgroundColor: color,
          transform:       pulsing ? [{ scale: pulse }] : undefined,
        },
      ]}
      accessible
      accessibilityLabel={label ?? variant}
      accessibilityRole="image"
    />
  )
}

StatusDot.displayName = 'StatusDot'

const styles = StyleSheet.create({
  dot: { flexShrink: 0 },
})
