/**
 * IconButton.native.tsx — Icon-only pressable button for React Native.
 *
 * Touch target is always at least 44×44 px per accessibility guidelines.
 * The `tooltip` prop from the web version is not applicable on mobile and is omitted.
 */
import React from 'react'
import { StyleSheet, View } from 'react-native'
import type { ViewStyle } from 'react-native'
import { useNativeTheme } from '@lenserfight/ui/providers'
import { Pressable } from './Pressable.native'

export type IconButtonVariant = 'ghost' | 'surface' | 'filled'
export type IconButtonSize    = 'sm' | 'md' | 'lg'

export interface IconButtonProps {
  onPress:    () => void
  icon:       React.ReactNode
  variant?:   IconButtonVariant
  size?:      IconButtonSize
  disabled?:  boolean
  haptic?:    boolean
  style?:     ViewStyle
  testID?:    string
  accessibilityLabel: string
}

const sizeMap: Record<IconButtonSize, { button: number; icon: number }> = {
  sm: { button: 32, icon: 16 },
  md: { button: 44, icon: 20 },
  lg: { button: 52, icon: 24 },
}

/**
 * @example
 * <IconButton onPress={goBack} icon={<ArrowLeftIcon />} accessibilityLabel="Go back" />
 */
export const IconButton = React.forwardRef<View, IconButtonProps>(
  (
    {
      onPress,
      icon,
      variant  = 'ghost',
      size     = 'md',
      disabled,
      haptic,
      style,
      testID,
      accessibilityLabel,
    },
    ref
  ) => {
    const { surface, active } = useNativeTheme()
    const { button: sz } = sizeMap[size]

    const variantBg: Record<IconButtonVariant, string> = {
      ghost:   'transparent',
      surface: surface.raised,
      filled:  active,
    }

    return (
      <Pressable
        ref={ref as any}
        onPress={onPress}
        disabled={disabled}
        haptic={haptic}
        testID={testID}
        accessibilityLabel={accessibilityLabel}
        style={[
          styles.base,
          {
            width:           Math.max(sz, 44),
            height:          Math.max(sz, 44),
            borderRadius:    sz / 2,
            backgroundColor: variantBg[variant],
          },
          style,
        ]}
      >
        {icon}
      </Pressable>
    )
  }
)

IconButton.displayName = 'IconButton'

const styles = StyleSheet.create({
  base: {
    alignItems:     'center',
    justifyContent: 'center',
  },
})
