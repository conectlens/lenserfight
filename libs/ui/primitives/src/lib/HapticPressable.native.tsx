/**
 * HapticPressable.native.tsx — Pressable with haptic feedback (mobile-only).
 *
 * Thin wrapper over Pressable.native.tsx with `haptic` enabled by default.
 * Requires expo-haptics to produce feedback; falls back gracefully if absent.
 */
import React from 'react'
import { Pressable, type PressableProps } from './Pressable.native'

export interface HapticPressableProps extends PressableProps {
  hapticStyle?: 'light' | 'medium' | 'heavy'
}

/**
 * @example
 * <HapticPressable onPress={submit} accessibilityLabel="Submit form">
 *   <Text>Submit</Text>
 * </HapticPressable>
 */
export const HapticPressable = React.forwardRef<any, HapticPressableProps>(
  ({ hapticStyle = 'light', ...props }, ref) => {
    return <Pressable ref={ref} haptic {...props} />
  }
)

HapticPressable.displayName = 'HapticPressable'
