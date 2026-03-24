/**
 * Radio.native.tsx — Radio button group for React Native.
 */
import React from 'react'
import { View, StyleSheet } from 'react-native'
import type { ViewStyle } from 'react-native'
import { useNativeTheme } from '@lenserfight/ui/providers'
import { Pressable } from '@lenserfight/ui/primitives'
import { Text } from '@lenserfight/ui/primitives'

export interface RadioOption {
  value:     string
  label:     string
  hint?:     string
  disabled?: boolean
}

export interface RadioProps {
  options:   RadioOption[]
  value:     string
  onChange:  (value: string) => void
  disabled?: boolean
  error?:    string
  style?:    ViewStyle
}

const DOT_SIZE = 20
const INNER    = 10

/**
 * @example
 * <Radio
 *   options={[{ value: 'lens', label: 'Lens' }, { value: 'fight', label: 'Fight' }]}
 *   value={mode}
 *   onChange={setMode}
 * />
 */
export const Radio: React.FC<RadioProps> = ({
  options,
  value,
  onChange,
  disabled: groupDisabled,
  error,
  style,
}) => {
  const { active, surface } = useNativeTheme()

  return (
    <View style={style} accessibilityRole="radiogroup">
      {options.map((opt, idx) => {
        const isSelected = opt.value === value
        const isDisabled = groupDisabled || opt.disabled

        return (
          <Pressable
            key={opt.value}
            onPress={() => !isDisabled && onChange(opt.value)}
            disabled={isDisabled}
            accessibilityRole="radio"
            accessibilityState={{ checked: isSelected, disabled: isDisabled }}
            accessibilityLabel={opt.label}
            style={[styles.row, idx < options.length - 1 && styles.rowSpacing, isDisabled && styles.disabled]}
          >
            {/* Outer circle */}
            <View
              style={[
                styles.outer,
                {
                  borderColor:     error ? '#ea3942' : isSelected ? active : surface.border,
                  backgroundColor: surface.raised,
                },
              ]}
            >
              {isSelected && (
                <View style={[styles.inner, { backgroundColor: active }]} />
              )}
            </View>

            {/* Label */}
            <View style={styles.textBlock}>
              <Text variant="bodyM">{opt.label}</Text>
              {opt.hint && <Text variant="caption" color="muted">{opt.hint}</Text>}
            </View>
          </Pressable>
        )
      })}
      {error && (
        <Text variant="caption" color="error" style={{ marginTop: 4 }}>{error}</Text>
      )}
    </View>
  )
}

Radio.displayName = 'Radio'

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    gap:            8,
  },
  rowSpacing: {
    marginBottom: 12,
  },
  outer: {
    width:          DOT_SIZE,
    height:         DOT_SIZE,
    borderRadius:   DOT_SIZE / 2,
    borderWidth:    2,
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
    marginTop:      2,
  },
  inner: {
    width:        INNER,
    height:       INNER,
    borderRadius: INNER / 2,
  },
  textBlock: {
    flex: 1,
  },
  disabled: {
    opacity: 0.5,
  },
})
