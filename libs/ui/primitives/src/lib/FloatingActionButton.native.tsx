/**
 * FloatingActionButton.native.tsx — FAB for React Native (mobile-only).
 *
 * Absolutely positioned at the bottom-right. Elevation 4.
 * Position it within a relative container (e.g. the screen root View).
 */
import React from 'react'
import { Platform, StyleSheet, View } from 'react-native'
import type { ViewStyle } from 'react-native'
import { useNativeTheme } from '@lenserfight/ui/providers/native'
import { Pressable } from './Pressable.native'

export interface FloatingActionButtonProps {
  onPress: () => void
  icon: React.ReactNode
  /** Overrides the default bottom-right absolute position */
  style?: ViewStyle
  disabled?: boolean
  haptic?: boolean
  accessibilityLabel: string
  testID?: string
}

const SIZE = 56

/**
 * @example
 * // Inside a screen with position:'relative'
 * <FloatingActionButton onPress={compose} icon={<PlusIcon />} accessibilityLabel="Compose" />
 */
export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onPress,
  icon,
  style,
  disabled,
  haptic = true,
  accessibilityLabel,
  testID,
}) => {
  const { active, elevation } = useNativeTheme()
  const spec = elevation(4)

  const shadowStyle: ViewStyle =
    Platform.OS === 'ios'
      ? {
          shadowColor: spec.iosShadow.color,
          shadowOffset: spec.iosShadow.offset,
          shadowOpacity: spec.iosShadow.opacity,
          shadowRadius: spec.iosShadow.radius,
        }
      : { elevation: spec.androidElevation }

  return (
    <View style={[styles.container, shadowStyle, style]} pointerEvents="box-none">
      <Pressable
        onPress={onPress}
        disabled={disabled}
        haptic={haptic}
        testID={testID}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        style={{
          width: SIZE,
          height: SIZE,
          borderRadius: SIZE / 2,
          backgroundColor: active,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </Pressable>
    </View>
  )
}

FloatingActionButton.displayName = 'FloatingActionButton'

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    zIndex: 100,
  },
})
