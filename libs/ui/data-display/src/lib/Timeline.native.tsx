/**
 * Timeline.native.tsx — Timeline / event list for React Native.
 */
import React from 'react'
import { View, StyleSheet } from 'react-native'
import type { ViewStyle } from 'react-native'
import { useNativeTheme } from '@lenserfight/ui/providers/native'
import { Text } from '@lenserfight/ui/primitives/native'

export interface TimelineItem {
  id: string
  title: string
  subtitle?: string
  time?: string
  icon?: React.ReactNode
}

export interface TimelineProps {
  items: TimelineItem[]
  style?: ViewStyle
}

/**
 * @example
 * <Timeline items={[
 *   { id: '1', title: 'Post created', time: '2 hours ago' },
 *   { id: '2', title: 'Comment added', time: '1 hour ago' },
 * ]} />
 */
export const Timeline: React.FC<TimelineProps> = ({ items, style }) => {
  const { surface, active } = useNativeTheme()

  return (
    <View style={style}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1
        return (
          <View key={item.id} style={styles.row}>
            {/* Left column: dot + line */}
            <View style={styles.rail}>
              <View style={[styles.dot, { backgroundColor: active }]}>{item.icon ?? null}</View>
              {!isLast && <View style={[styles.line, { backgroundColor: surface.border }]} />}
            </View>

            {/* Content */}
            <View style={[styles.content, !isLast && styles.contentSpacing]}>
              <Text variant="bodyS" weight="semibold">
                {item.title}
              </Text>
              {item.subtitle && (
                <Text variant="caption" color="muted">
                  {item.subtitle}
                </Text>
              )}
              {item.time && (
                <Text variant="caption" color="muted" style={{ marginTop: 2 }}>
                  {item.time}
                </Text>
              )}
            </View>
          </View>
        )
      })}
    </View>
  )
}

Timeline.displayName = 'Timeline'

const DOT_SIZE = 12

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  rail: {
    alignItems: 'center',
    width: 24,
    marginRight: 12,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  line: {
    width: 2,
    flex: 1,
    marginTop: 2,
  },
  content: {
    flex: 1,
    paddingTop: 0,
  },
  contentSpacing: {
    paddingBottom: 16,
  },
})
