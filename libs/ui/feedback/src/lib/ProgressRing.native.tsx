/**
 * ProgressRing.native.tsx — Circular progress indicator for React Native (mobile-only).
 *
 * Uses react-native-svg (already installed) for the ring arc.
 */
import React from 'react'
import { View, StyleSheet } from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import { useNativeTheme } from '@lenserfight/ui/providers'
import { Text } from '@lenserfight/ui/primitives'

export interface ProgressRingProps {
  /** 0–100 */
  value:      number
  size?:      number
  strokeWidth?: number
  showLabel?: boolean
  label?:     string
}

/**
 * @example
 * <ProgressRing value={72} size={64} showLabel />
 */
export const ProgressRing: React.FC<ProgressRingProps> = ({
  value,
  size        = 64,
  strokeWidth = 5,
  showLabel   = false,
  label,
}) => {
  const { active, surface } = useNativeTheme()
  const clampedValue = Math.min(100, Math.max(0, value))

  const radius         = (size - strokeWidth) / 2
  const circumference  = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (clampedValue / 100) * circumference

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {/* Track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={surface.border}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Arc */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={active}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          fill="none"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>

      {showLabel && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <View style={styles.labelContainer}>
            <Text variant="caption" weight="semibold" align="center">
              {label ?? `${clampedValue}%`}
            </Text>
          </View>
        </View>
      )}
    </View>
  )
}

ProgressRing.displayName = 'ProgressRing'

const styles = StyleSheet.create({
  labelContainer: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
  },
})
