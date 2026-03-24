/**
 * Chip.native.tsx — Compact labeled element for React Native.
 */
import React from 'react'
import { StyleSheet, View } from 'react-native'
import { useNativeTheme } from '@lenserfight/ui/providers'
import { Pressable } from './Pressable.native'
import { Text } from './Text.native'

export type ChipVariant = 'default' | 'active' | 'destructive'

export interface ChipProps {
  label:    string
  variant?: ChipVariant
  onPress?: () => void
  onRemove?: () => void
  disabled?: boolean
  icon?:    React.ReactNode
  testID?:  string
}

/**
 * @example
 * <Chip label="TypeScript" onRemove={() => removeTag('ts')} />
 */
export const Chip: React.FC<ChipProps> = ({
  label,
  variant  = 'default',
  onPress,
  onRemove,
  disabled,
  icon,
  testID,
}) => {
  const { surface, active, radius, spacing } = useNativeTheme()

  const bgMap: Record<ChipVariant, string> = {
    default:     surface.overlay,
    active:      active + '22',   // 13% opacity tint
    destructive: '#ea394222',
  }

  const Wrapper = onPress || onRemove ? Pressable : View

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        flexDirection:  'row',
        alignItems:     'center',
        backgroundColor: bgMap[variant],
        borderRadius:   radius.full,
        borderWidth:    1,
        borderColor:    surface.border,
        paddingHorizontal: spacing[3],
        paddingVertical:   spacing[1],
        gap:            spacing[1],
      }}
    >
      {icon && <View>{icon}</View>}
      <Text variant="caption" weight="medium" style={{ color: surface.text }}>
        {label}
      </Text>
      {onRemove && (
        <Pressable onPress={onRemove} accessibilityLabel={`Remove ${label}`} style={styles.remove}>
          <Text variant="caption" color="muted">×</Text>
        </Pressable>
      )}
    </Pressable>
  )
}

Chip.displayName = 'Chip'

const styles = StyleSheet.create({
  remove: {
    marginLeft: 2,
  },
})
