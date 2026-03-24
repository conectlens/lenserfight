/**
 * Checkbox.native.tsx — Checkbox for React Native.
 *
 * Built with Pressable + Animated checkmark. No native checkbox API in RN.
 * Uses a Unicode checkmark (✓) for the checked state indicator.
 */
import React, { useRef, useCallback } from 'react'
import { Animated, View, StyleSheet } from 'react-native'
import type { ViewStyle } from 'react-native'
import { useNativeTheme } from '@lenserfight/ui/providers'
import { Pressable } from '@lenserfight/ui/primitives'
import { Text } from '@lenserfight/ui/primitives'

export interface CheckboxProps {
  checked:     boolean
  onChange:    (checked: boolean) => void
  label?:      string
  hint?:       string
  error?:      string
  disabled?:   boolean
  indeterminate?: boolean
  style?:      ViewStyle
  testID?:     string
}

const BOX_SIZE = 20

/**
 * @example
 * <Checkbox checked={agreed} onChange={setAgreed} label="I agree to the terms" />
 */
export const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  onChange,
  label,
  hint,
  error,
  disabled,
  indeterminate,
  style,
  testID,
}) => {
  const { active, surface, radius } = useNativeTheme()
  const scale = useRef(new Animated.Value(checked ? 1 : 0)).current

  const handlePress = useCallback(() => {
    if (disabled) return
    const next = !checked
    Animated.spring(scale, {
      toValue:         next ? 1 : 0,
      useNativeDriver: true,
      speed:           30,
      bounciness:      5,
    }).start()
    onChange(next)
  }, [checked, disabled, onChange, scale])

  const isChecked = checked || indeterminate

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      testID={testID}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: indeterminate ? 'mixed' : checked, disabled }}
      accessibilityLabel={label}
      style={[styles.row, disabled && styles.disabled, style]}
    >
      {/* Box */}
      <View
        style={[
          styles.box,
          {
            borderRadius:    radius.sm,
            borderColor:     error ? '#ea3942' : isChecked ? active : surface.border,
            backgroundColor: isChecked ? active : surface.raised,
          },
        ]}
      >
        <Animated.Text
          style={[
            styles.checkmark,
            { transform: [{ scale }], color: '#ffffff' },
          ]}
        >
          {indeterminate ? '−' : '✓'}
        </Animated.Text>
      </View>

      {/* Label */}
      {(label || hint) && (
        <View style={styles.textBlock}>
          {label && <Text variant="bodyM">{label}</Text>}
          {hint  && <Text variant="caption" color="muted">{hint}</Text>}
          {error && <Text variant="caption" color="error">{error}</Text>}
        </View>
      )}
    </Pressable>
  )
}

Checkbox.displayName = 'Checkbox'

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    gap:            8,
  },
  box: {
    width:          BOX_SIZE,
    height:         BOX_SIZE,
    borderWidth:    2,
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
    marginTop:      2,
  },
  checkmark: {
    fontSize:   13,
    fontWeight: '700',
    lineHeight: 16,
  },
  textBlock: {
    flex: 1,
  },
  disabled: {
    opacity: 0.5,
  },
})
