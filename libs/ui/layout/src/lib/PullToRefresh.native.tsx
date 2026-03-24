/**
 * PullToRefresh.native.tsx — Pull-to-refresh wrapper for ScrollView (mobile-only).
 *
 * Provides a RefreshControl-enabled ScrollView.
 * For FlatList usage, attach the `refreshControl` prop directly.
 */
import React from 'react'
import { RefreshControl, ScrollView, StyleSheet } from 'react-native'
import type { ViewStyle } from 'react-native'
import { useNativeTheme } from '@lenserfight/ui/providers'

export interface PullToRefreshProps {
  onRefresh:    () => Promise<void> | void
  children:     React.ReactNode
  style?:       ViewStyle
  contentStyle?: ViewStyle
}

/**
 * @example
 * <PullToRefresh onRefresh={loadFeed}>
 *   <FeedList data={posts} />
 * </PullToRefresh>
 */
export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  children,
  style,
  contentStyle,
}) => {
  const { active } = useNativeTheme()
  const [refreshing, setRefreshing] = React.useState(false)

  const handleRefresh = React.useCallback(async () => {
    setRefreshing(true)
    try {
      await onRefresh()
    } finally {
      setRefreshing(false)
    }
  }, [onRefresh])

  return (
    <ScrollView
      style={[styles.root, style]}
      contentContainerStyle={contentStyle}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={active}
          colors={[active]}
        />
      }
    >
      {children}
    </ScrollView>
  )
}

PullToRefresh.displayName = 'PullToRefresh'

const styles = StyleSheet.create({
  root: { flex: 1 },
})
