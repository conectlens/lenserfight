/**
 * Switch.native.tsx — Toggle switch for React Native.
 *
 * Uses RN's built-in Switch with token-derived colors.
 */
import React from 'react'
import { Switch as RNSwitch, View, StyleSheet } from 'react-native'
import type { ViewStyle } from 'react-native'
import { useNativeTheme } from '@lenserfight/ui/providers/native'
import { Text } from '@lenserfight/ui/primitives/native'

export interface SwitchProps {
  value: boolean
  onValueChange: (value: boolean) => void
  disabled?: boolean
  label?: string
  hint?: string
  style?: ViewStyle
  testID?: string
  accessibilityLabel?: string
}

/**
 * @example
 * <Switch value={notifications} onValueChange={setNotifications} label="Push notifications" />
 */
export const Switch: React.FC<SwitchProps> = ({
  value,
  onValueChange,
  disabled,
  label,
  hint,
  style,
  testID,
  accessibilityLabel,
}) => {
  const { active, surface } = useNativeTheme()

  return (
    <View style={[styles.row, disabled && styles.disabled, style]}>
      {(label || hint) && (
        <View style={styles.textBlock}>
          {label && (
            <Text variant="bodyM" weight="medium">
              {label}
            </Text>
          )}
          {hint && (
            <Text variant="caption" color="muted">
              {hint}
            </Text>
          )}
        </View>
      )}

      <RNSwitch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        testID={testID}
        accessible
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityRole="switch"
        accessibilityState={{ checked: value, disabled }}
        trackColor={{ false: surface.border, true: active + 'aa' }}
        thumbColor={value ? active : surface.textMuted}
        ios_backgroundColor={surface.border}
      />
    </View>
  )
}

Switch.displayName = 'Switch'

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textBlock: {
    flex: 1,
    marginRight: 12,
  },
  disabled: {
    opacity: 0.5,
  },
})
