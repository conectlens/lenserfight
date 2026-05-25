import React from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { Pressable, Surface, Text } from '@lenserfight/ui/primitives/native'
import { useNativeTheme } from '@lenserfight/ui/providers/native'

export type MobileButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

interface MobileButtonProps {
  label: string
  onPress: () => void
  variant?: MobileButtonVariant
  disabled?: boolean
  loading?: boolean
  testID?: string
}

export const MobileButton: React.FC<MobileButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  testID,
}) => {
  const { active, surface, status, radius, spacing } = useNativeTheme()
  const isPrimary = variant === 'primary'
  const isDanger = variant === 'danger'
  const backgroundColor = isPrimary ? active : isDanger ? status.error.bg : surface.raised
  const textColor = isPrimary || isDanger ? surface.base : surface.text

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      testID={testID}
      accessibilityLabel={label}
      accessibilityRole="button"
      style={[disabled && styles.disabled]}
    >
      <Surface
        variant={variant === 'ghost' ? 'flat' : 'raised'}
        borderRadius={radius.xl}
        style={[
          styles.button,
          {
            backgroundColor,
            paddingVertical: spacing[3],
            paddingHorizontal: spacing[4],
          },
        ]}
      >
        <View style={styles.content}>
          {loading && <ActivityIndicator size="small" color={textColor} />}
          <Text variant="bodyM" weight="semibold" align="center" style={{ color: textColor }}>
            {label}
          </Text>
        </View>
      </Surface>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
})
