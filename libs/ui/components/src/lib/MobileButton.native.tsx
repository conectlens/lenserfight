import React from 'react'
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native'
import type { StyleProp, TextStyle, ViewStyle } from 'react-native'
import { Text } from '@lenserfight/ui/primitives/native'
import { useNativeTheme } from '@lenserfight/ui/providers/native'
import type { NativeElevationSpec, NativeThemeTokens } from '@lenserfight/ui/tokens'

export type MobileButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'

export type MobileButtonSize = 'sm' | 'md' | 'lg'

export interface MobileButtonProps {
  label: string
  onPress: () => void
  variant?: MobileButtonVariant
  size?: MobileButtonSize
  disabled?: boolean
  loading?: boolean
  fullWidth?: boolean
  style?: StyleProp<ViewStyle>
  testID?: string
  accessibilityLabel?: string
  accessibilityHint?: string
}

type ResolvedButtonStyle = {
  container: ViewStyle
  text: TextStyle
  indicator: string
}

const withAlpha = (hex: string, alpha: string): string => `${hex}${alpha}`

const shadowFromSpec = (spec: NativeElevationSpec): ViewStyle =>
  Platform.OS === 'ios'
    ? {
        shadowColor: spec.iosShadow.color,
        shadowOffset: spec.iosShadow.offset,
        shadowOpacity: spec.iosShadow.opacity,
        shadowRadius: spec.iosShadow.radius,
      }
    : { elevation: spec.androidElevation }

function resolveButtonStyle(
  variant: MobileButtonVariant,
  theme: NativeThemeTokens,
  pressed: boolean,
  isDisabled: boolean
): ResolvedButtonStyle {
  const isDark = theme.colorScheme === 'dark'
  const raised = shadowFromSpec(theme.elevation(1))
  const flat = shadowFromSpec(theme.elevation(0))
  const opacity = isDisabled ? 0.45 : 1

  switch (variant) {
    case 'primary':
      return {
        container: {
          backgroundColor: pressed ? theme.colors.primaryYellow : theme.colors.primaryYellow,
          opacity,
          ...(pressed ? flat : raised),
        },
        text: {
          color: theme.colors.primaryNavy,
          fontWeight: theme.fontWeight.bold,
        },
        indicator: theme.colors.primaryNavy,
      }

    case 'secondary': {
      const accent = isDark ? theme.colors.primaryYellow : theme.colors.primaryNavy
      return {
        container: {
          backgroundColor: pressed ? withAlpha(accent, isDark ? '1A' : '12') : 'transparent',
          borderColor: accent,
          borderWidth: 1.5,
          opacity,
        },
        text: {
          color: accent,
          fontWeight: theme.fontWeight.semibold,
        },
        indicator: accent,
      }
    }

    case 'outline':
      return {
        container: {
          backgroundColor: pressed ? theme.surface.overlay : 'transparent',
          borderColor: theme.surface.border,
          borderWidth: 1,
          opacity,
        },
        text: {
          color: theme.surface.text,
          fontWeight: theme.fontWeight.medium,
        },
        indicator: theme.surface.text,
      }

    case 'ghost':
      return {
        container: {
          backgroundColor: pressed ? theme.surface.overlay : 'transparent',
          opacity,
        },
        text: {
          color: theme.surface.textMuted,
          fontWeight: theme.fontWeight.medium,
        },
        indicator: theme.surface.textMuted,
      }

    case 'danger':
      return {
        container: {
          backgroundColor: pressed ? theme.status.error.bg : theme.status.error.bg,
          opacity,
          ...(pressed ? flat : raised),
        },
        text: {
          color: theme.status.error.text,
          fontWeight: theme.fontWeight.bold,
        },
        indicator: theme.status.error.text,
      }
  }
}

const sizeStyles: Record<MobileButtonSize, ViewStyle> = {
  sm: {
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  md: {
    minHeight: 48,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  lg: {
    minHeight: 54,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
}

const labelVariants: Record<MobileButtonSize, 'bodyS' | 'bodyM' | 'bodyL'> = {
  sm: 'bodyS',
  md: 'bodyM',
  lg: 'bodyL',
}

export const MobileButton: React.FC<MobileButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled,
  loading,
  fullWidth,
  style,
  testID,
  accessibilityLabel,
  accessibilityHint,
}) => {
  const theme = useNativeTheme()
  const isDisabled = Boolean(disabled || loading)

  return (
    <Pressable
      onPress={isDisabled ? undefined : onPress}
      disabled={isDisabled}
      testID={testID}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: Boolean(loading) }}
      style={({ pressed }) => {
        const resolved = resolveButtonStyle(variant, theme, pressed, isDisabled)
        return [
          styles.base,
          sizeStyles[size],
          { borderRadius: theme.radius.lg },
          fullWidth ? styles.fullWidth : undefined,
          resolved.container,
          style,
        ]
      }}
    >
      {({ pressed }) => {
        const resolved = resolveButtonStyle(variant, theme, pressed, isDisabled)
        return (
          <View style={styles.content}>
            {loading && <ActivityIndicator size="small" color={resolved.indicator} />}
            <Text
              variant={labelVariants[size]}
              style={[styles.label, resolved.text]}
              numberOfLines={1}
            >
              {label}
            </Text>
          </View>
        )
      }}
    </Pressable>
  )
}

MobileButton.displayName = 'MobileButton'

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  label: {
    letterSpacing: 0,
    textAlign: 'center',
  },
})
