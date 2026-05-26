/**
 * SegmentedControl.native.tsx — Segmented control for React Native.
 *
 * Uses SegmentedControlIOS on iOS; a custom Pressable row on Android.
 */
import React from 'react'
import { Platform, StyleSheet, View } from 'react-native'
import type { ViewStyle } from 'react-native'
import { useNativeTheme } from '@lenserfight/ui/providers/native'
import { Pressable } from '@lenserfight/ui/primitives/native'
import { Text } from '@lenserfight/ui/primitives/native'

export interface SegmentedControlProps {
  options: string[]
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  style?: ViewStyle
}

/**
 * @example
 * <SegmentedControl options={['Day', 'Week', 'Month']} value={period} onChange={setPeriod} />
 */
export const SegmentedControl: React.FC<SegmentedControlProps> = ({
  options,
  value,
  onChange,
  disabled,
  style,
}) => {
  if (Platform.OS === 'ios') {
    // Use native SegmentedControlIOS when available
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const {
        default: SegmentedControlIOS,
      } = require('@react-native-segmented-control/segmented-control')
      return (
        <SegmentedControlIOS
          values={options}
          selectedIndex={options.indexOf(value)}
          onChange={(e: any) => onChange(options[e.nativeEvent.selectedSegmentIndex])}
          enabled={!disabled}
          style={style}
        />
      )
    } catch {
      // Fall through to custom implementation if package not available
    }
  }

  // Custom cross-platform implementation
  return (
    <CustomSegmentedControl
      options={options}
      value={value}
      onChange={onChange}
      disabled={disabled}
      style={style}
    />
  )
}

const CustomSegmentedControl: React.FC<SegmentedControlProps> = ({
  options,
  value,
  onChange,
  disabled,
  style,
}) => {
  const { active, surface, radius } = useNativeTheme()

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: surface.overlay,
          borderRadius: radius.lg,
          borderColor: surface.border,
        },
        style,
      ]}
    >
      {options.map((opt) => {
        const isActive = opt === value
        return (
          <Pressable
            key={opt}
            onPress={() => !disabled && onChange(opt)}
            disabled={disabled}
            accessibilityRole="radio"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={opt}
            style={[
              styles.segment,
              { borderRadius: radius.md },
              isActive && {
                backgroundColor: surface.base,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.08,
                shadowRadius: 2,
                elevation: 2,
              },
            ]}
          >
            <Text
              variant="bodyS"
              weight={isActive ? 'semibold' : 'regular'}
              style={{ color: isActive ? active : surface.textMuted }}
            >
              {opt}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

SegmentedControl.displayName = 'SegmentedControl'

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderWidth: 1,
    padding: 3,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
})
