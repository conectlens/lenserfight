/**
 * PageHeader.native.tsx — Page-level header section for React Native.
 */
import React from 'react'
import { View, StyleSheet } from 'react-native'
import type { ViewStyle } from 'react-native'
import { Text } from '@lenserfight/ui/primitives'

export interface PageHeaderProps {
  title:     string
  subtitle?: string
  /** Optional action slot (e.g. a Button) */
  action?:   React.ReactNode
  style?:    ViewStyle
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  action,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.text}>
        <Text variant="h2" weight="bold">{title}</Text>
        {subtitle && (
          <Text variant="bodyM" color="muted" style={{ marginTop: 4 }}>
            {subtitle}
          </Text>
        )}
      </View>
      {action && <View style={styles.action}>{action}</View>}
    </View>
  )
}

PageHeader.displayName = 'PageHeader'

const styles = StyleSheet.create({
  container: {
    flexDirection:  'row',
    alignItems:     'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical:   16,
  },
  text: { flex: 1 },
  action: { marginLeft: 12 },
})
