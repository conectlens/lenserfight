/**
 * Stat.native.tsx — Statistic display for React Native.
 */
import React from 'react'
import { View, StyleSheet } from 'react-native'
import type { ViewStyle } from 'react-native'
import { Text } from '@lenserfight/ui/primitives'

export interface StatProps {
  label:  string
  value:  string | number
  delta?: { value: string; positive: boolean }
  icon?:  React.ReactNode
  style?: ViewStyle
}

/**
 * @example
 * <Stat label="Total lenses" value={128} delta={{ value: '+12', positive: true }} />
 */
export const Stat: React.FC<StatProps> = ({
  label,
  value,
  delta,
  icon,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      {icon && <View style={styles.icon}>{icon}</View>}
      <Text variant="caption" color="muted" style={{ marginBottom: 2 }}>{label}</Text>
      <Text variant="h3" weight="bold">{String(value)}</Text>
      {delta && (
        <Text
          variant="caption"
          weight="medium"
          style={{ color: delta.positive ? '#2eb773' : '#ea3942', marginTop: 2 }}
        >
          {delta.value}
        </Text>
      )}
    </View>
  )
}

Stat.displayName = 'Stat'

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
  },
  icon: {
    marginBottom: 4,
  },
})
