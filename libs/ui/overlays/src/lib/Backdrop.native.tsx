/**
 * Backdrop.native.tsx — Dimmed overlay for React Native.
 *
 * Note: The `blur` prop is accepted for API compatibility but has no effect on native.
 * expo-blur is not installed. Add expo-blur to apps/mobile if blur is required.
 */
import React from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import type { ViewStyle } from 'react-native'

export interface BackdropProps {
  visible:    boolean
  onDismiss?: () => void
  /** Accepted for API compatibility — no-op on native (expo-blur not installed) */
  blur?:      boolean
  opacity?:   number
  style?:     ViewStyle
}

/**
 * @example
 * <Backdrop visible={isOpen} onDismiss={close} />
 */
export const Backdrop: React.FC<BackdropProps> = ({
  visible,
  onDismiss,
  opacity = 0.5,
  style,
}) => {
  if (!visible) return null

  if (onDismiss) {
    return (
      <Pressable
        style={[styles.backdrop, { opacity }, style]}
        onPress={onDismiss}
        accessible
        accessibilityLabel="Close"
        accessibilityRole="button"
      />
    )
  }

  return <View style={[styles.backdrop, { opacity }, style]} />
}

Backdrop.displayName = 'Backdrop'

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
})
