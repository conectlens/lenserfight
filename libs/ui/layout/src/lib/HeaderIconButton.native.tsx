/**
 * HeaderIconButton.native.tsx
 *
 * Minimal touchable icon for use in Stack / Tabs header leading and
 * trailing slots. Resolves color from theme.active by default.
 *
 * GRASP — Low Coupling: no navigation or route knowledge; purely a
 * pressable icon primitive that header composers can slot in.
 */
import { Ionicons } from '@expo/vector-icons'
import { useNativeTheme } from '@lenserfight/ui/providers/native'
import React from 'react'
import { Pressable, StyleSheet } from 'react-native'

export interface HeaderIconButtonProps {
  /** Ionicons icon name */
  icon: React.ComponentProps<typeof Ionicons>['name']
  onPress: () => void
  accessibilityLabel: string
  /** Override icon color. Defaults to theme.active. */
  color?: string
  size?: number
  testID?: string
}

/**
 * @example
 * <HeaderIconButton
 *   icon="add-circle-outline"
 *   onPress={() => router.push('/battle/create')}
 *   accessibilityLabel="New battle"
 * />
 */
export const HeaderIconButton: React.FC<HeaderIconButtonProps> = ({
  icon,
  onPress,
  accessibilityLabel,
  color,
  size = 22,
  testID,
}) => {
  const theme = useNativeTheme()
  const iconColor = color ?? theme.active

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      hitSlop={12}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      testID={testID}
    >
      <Ionicons name={icon} size={size} color={iconColor} />
    </Pressable>
  )
}

HeaderIconButton.displayName = 'HeaderIconButton'

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 4,
  },
  pressed: {
    opacity: 0.55,
  },
})
