/**
 * Pressable.native.tsx — Touch interaction primitive for React Native.
 *
 * Provides consistent press feedback (opacity animation) and disabled state.
 * The `onPress` prop type is `() => void` — the GestureResponderEvent is not exposed
 * because it is rarely consumed by callers, and keeping the shared contract simple
 * avoids forcing web consumers to handle native event types.
 *
 * Optional haptic feedback via expo-haptics. Falls back silently if not installed.
 */
import React, { useCallback, useRef } from 'react'
import {
  Pressable as RNPressable,
  Animated,
  StyleSheet,
} from 'react-native'
import type { StyleProp, ViewStyle } from 'react-native'

// Optional expo-haptics integration
let Haptics: { impactAsync: (style?: string) => Promise<void> } | null = null
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Haptics = require('expo-haptics')
} catch {
  // expo-haptics not installed; haptic feedback is silently skipped
}

export interface PressableProps {
  onPress?:     () => void
  onLongPress?: () => void
  disabled?:    boolean
  haptic?:      boolean
  /** Pressed opacity (0–1). Default: 0.7 */
  pressedOpacity?: number
  style?:       StyleProp<ViewStyle>
  children?:    React.ReactNode
  testID?:      string
  accessible?:  boolean
  accessibilityLabel?: string
  accessibilityRole?:  'button' | 'link' | 'menuitem' | 'tab' | 'none'
  accessibilityHint?:  string
  accessibilityState?: { disabled?: boolean; checked?: boolean; selected?: boolean }
}

/**
 * Base pressable primitive. Use in place of TouchableOpacity throughout the app.
 *
 * @example
 * <Pressable onPress={handlePress} haptic>
 *   <Text>Tap me</Text>
 * </Pressable>
 */
export const Pressable = React.forwardRef<any, PressableProps>(
  (
    {
      onPress,
      onLongPress,
      disabled = false,
      haptic = false,
      pressedOpacity = 0.7,
      style,
      children,
      testID,
      accessible,
      accessibilityLabel,
      accessibilityRole = 'button',
      accessibilityHint,
      accessibilityState,
    },
    ref
  ) => {
    const opacity = useRef(new Animated.Value(1)).current

    const animatedStyle = { opacity }

    const handlePressIn = useCallback(() => {
      Animated.timing(opacity, { toValue: pressedOpacity, duration: 80, useNativeDriver: true }).start()
    }, [pressedOpacity, opacity])

    const handlePressOut = useCallback(() => {
      Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }).start()
    }, [opacity])

    const handlePress = useCallback(async () => {
      if (haptic && Haptics) {
        try { await Haptics.impactAsync('light') } catch { /* ignore */ }
      }
      onPress?.()
    }, [haptic, onPress])

    return (
      <RNPressable
        ref={ref}
        onPress={handlePress}
        onLongPress={onLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        testID={testID}
        accessible={accessible ?? true}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole={accessibilityRole}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled, ...accessibilityState }}
      >
        <Animated.View style={[animatedStyle, style]}>
          {children}
        </Animated.View>
      </RNPressable>
    )
  }
)

Pressable.displayName = 'Pressable'

const styles = StyleSheet.create({
  disabled: {
    opacity: 0.38,
  },
})
