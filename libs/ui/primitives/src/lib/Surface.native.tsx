/**
 * Surface.native.tsx — Neumorphic surface container for React Native.
 *
 * Neumorphic dual-shadow strategy:
 *   iOS:     3-View stack — highlight View (white shadow, upper-left) behind a
 *            shadow View (dark shadow, lower-right) that contains the children.
 *   Android: Single `elevation` integer (Material shadow, no highlight layer).
 *
 * The `as` prop from the web version is not applicable in React Native and is omitted.
 */
import React from 'react'
import { Platform, StyleSheet, View } from 'react-native'
import { useNativeTheme } from '@lenserfight/ui/providers'
import type { NativeElevationLevel } from '@lenserfight/ui/tokens'
import type { ViewStyle } from 'react-native'

export type SurfaceVariant = 'raised' | 'flat' | 'inset'

export interface SurfaceProps {
  variant?:       SurfaceVariant
  /** Elevation level 0–5 for raised; 1–3 for inset (defaults: raised=2, inset=2, flat=0) */
  elevation?:     NativeElevationLevel
  borderRadius?:  number
  style?:         ViewStyle
  children?:      React.ReactNode
  testID?:        string
  accessible?:    boolean
  accessibilityLabel?: string
}

/**
 * Base neumorphic surface container.
 * All visual cards, panels, and containers should be built on top of Surface.
 *
 * @example
 * <Surface variant="raised" borderRadius={16} style={{ padding: 16 }}>
 *   Card content
 * </Surface>
 */
export const Surface = React.forwardRef<View, SurfaceProps>(
  (
    {
      variant = 'raised',
      elevation: elevProp,
      borderRadius = 16,
      style,
      children,
      testID,
      accessible,
      accessibilityLabel,
    },
    ref
  ) => {
    const { surface, elevation, elevationInset, colorScheme } = useNativeTheme()

    const isFlat   = variant === 'flat'
    const isInset  = variant === 'inset'
    const isRaised = variant === 'raised'

    const defaultLevel = isInset ? 2 : isRaised ? 2 : 0
    const level = (elevProp ?? defaultLevel) as NativeElevationLevel

    const spec = isInset
      ? elevationInset(Math.min(level, 3) as 1 | 2 | 3)
      : elevation(level)

    const bgColor = isFlat
      ? 'transparent'
      : isInset
      ? surface.sunken
      : surface.raised

    if (isFlat) {
      return (
        <View ref={ref} style={[{ backgroundColor: 'transparent', borderRadius }, style]} testID={testID} accessible={accessible} accessibilityLabel={accessibilityLabel}>
          {children}
        </View>
      )
    }

    // Android path — single elevation
    if (Platform.OS !== 'ios') {
      return (
        <View
          ref={ref}
          style={[
            styles.base,
            {
              backgroundColor: bgColor,
              borderRadius,
              elevation: spec.androidElevation,
            },
            style,
          ]}
          testID={testID}
          accessible={accessible}
          accessibilityLabel={accessibilityLabel}
        >
          {children}
        </View>
      )
    }

    // iOS path — 3-View dual-shadow stack
    const { iosShadow, iosHighlight } = spec
    const isDark = colorScheme === 'dark'

    return (
      <View
        style={[styles.container, { borderRadius }]}
        testID={testID}
        accessible={accessible}
        accessibilityLabel={accessibilityLabel}
      >
        {/* Highlight layer (upper-left, white/light shadow) */}
        {!isDark && iosHighlight.opacity > 0 && (
          <View
            style={[
              StyleSheet.absoluteFillObject,
              {
                borderRadius,
                shadowColor:   iosHighlight.color,
                shadowOffset:  iosHighlight.offset,
                shadowOpacity: iosHighlight.opacity,
                shadowRadius:  iosHighlight.radius,
              },
            ]}
          />
        )}

        {/* Content + dark shadow layer */}
        <View
          ref={ref}
          style={[
            styles.base,
            {
              backgroundColor: bgColor,
              borderRadius,
              shadowColor:   iosShadow.color,
              shadowOffset:  iosShadow.offset,
              shadowOpacity: iosShadow.opacity,
              shadowRadius:  iosShadow.radius,
            },
            style,
          ]}
        >
          {children}
        </View>
      </View>
    )
  }
)

Surface.displayName = 'Surface'

const styles = StyleSheet.create({
  container: {
    overflow: 'visible',
  },
  base: {
    overflow: 'visible',
  },
})
