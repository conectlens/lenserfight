/**
 * EmptyState.native.tsx — Empty state display for React Native.
 */
import React from 'react'
import { View, StyleSheet } from 'react-native'
import type { ViewStyle } from 'react-native'
import { Text } from '@lenserfight/ui/primitives'

export interface EmptyStateProps {
  title:       string
  description?: string
  icon?:       React.ReactNode
  action?:     React.ReactNode
  style?:      ViewStyle
}

/**
 * @example
 * <EmptyState
 *   title="No lenses yet"
 *   description="Submit your first take to get started."
 *   action={<Button onPress={compose}>Create lens</Button>}
 * />
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  action,
  style,
}) => {
  return (
    <View style={[styles.container, style]} accessible accessibilityRole="none">
      {icon && <View style={styles.icon}>{icon}</View>}
      <Text variant="h4" weight="semibold" align="center" style={styles.title}>
        {title}
      </Text>
      {description && (
        <Text variant="bodyM" color="muted" align="center" style={styles.description}>
          {description}
        </Text>
      )}
      {action && <View style={styles.action}>{action}</View>}
    </View>
  )
}

EmptyState.displayName = 'EmptyState'

const styles = StyleSheet.create({
  container: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    padding:        32,
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    marginBottom: 8,
  },
  description: {
    marginBottom: 16,
  },
  action: {
    marginTop: 8,
  },
})
