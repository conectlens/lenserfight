/**
 * List.native.tsx — Static list for React Native.
 *
 * Renders a View-based list for short, static content.
 * For long or dynamic lists, use FlatList directly at the feature layer.
 */
import React from 'react'
import { View, StyleSheet } from 'react-native'
import type { ViewStyle } from 'react-native'
import { useNativeTheme } from '@lenserfight/ui/providers/native'
import { Pressable } from '@lenserfight/ui/primitives/native'
import { Text } from '@lenserfight/ui/primitives/native'
import { Divider } from '@lenserfight/ui/primitives/native'

// ── ListItem ──────────────────────────────────────────────────────────────────

export interface ListItemProps {
  title: string
  subtitle?: string
  leading?: React.ReactNode
  trailing?: React.ReactNode
  onPress?: () => void
  disabled?: boolean
  style?: ViewStyle
}

export const ListItem: React.FC<ListItemProps> = ({
  title,
  subtitle,
  leading,
  trailing,
  onPress,
  disabled,
  style,
}) => {
  const content = (
    <View style={[styles.item, style]}>
      {leading && <View style={styles.leading}>{leading}</View>}
      <View style={styles.body}>
        <Text variant="bodyM">{title}</Text>
        {subtitle && (
          <Text variant="caption" color="muted">
            {subtitle}
          </Text>
        )}
      </View>
      {trailing && <View style={styles.trailing}>{trailing}</View>}
    </View>
  )

  if (onPress) {
    return (
      <Pressable onPress={onPress} disabled={disabled} accessibilityLabel={title}>
        {content}
      </Pressable>
    )
  }

  return content
}

// ── List ─────────────────────────────────────────────────────────────────────

export interface ListProps {
  children: React.ReactNode
  divided?: boolean
  style?: ViewStyle
}

/**
 * Static list container. For long lists, use FlatList at the feature layer.
 *
 * @example
 * <List divided>
 *   <ListItem title="Settings" onPress={openSettings} />
 *   <ListItem title="Help" onPress={openHelp} />
 * </List>
 */
export const List: React.FC<ListProps> = ({ children, divided, style }) => {
  const childArray = React.Children.toArray(children)

  return (
    <View style={style}>
      {childArray.map((child, index) => (
        <React.Fragment key={index}>
          {child}
          {divided && index < childArray.length - 1 && <Divider style={{ marginHorizontal: 16 }} />}
        </React.Fragment>
      ))}
    </View>
  )
}

List.displayName = 'List'
ListItem.displayName = 'ListItem'

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 56,
  },
  leading: {
    marginRight: 12,
  },
  body: {
    flex: 1,
  },
  trailing: {
    marginLeft: 8,
  },
})
