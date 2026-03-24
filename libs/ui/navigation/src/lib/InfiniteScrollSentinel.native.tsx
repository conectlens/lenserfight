/**
 * InfiniteScrollSentinel.native.tsx — scroll sentinel for React Native.
 *
 * On web, this uses IntersectionObserver. On native, the sentinel fires
 * onVisible when the component mounts (it's always "in view" once rendered).
 *
 * For proper infinite scroll, use FlatList's onEndReached + onEndReachedThreshold
 * at the feature layer. This component is provided for shared code compatibility.
 */
import React, { useEffect } from 'react'
import { View } from 'react-native'

export interface InfiniteScrollSentinelProps {
  onVisible: () => void
  /** Not used on native — IntersectionObserver is a web API */
  threshold?: number
}

/**
 * @example
 * <InfiniteScrollSentinel onVisible={loadMore} />
 */
export const InfiniteScrollSentinel: React.FC<InfiniteScrollSentinelProps> = ({
  onVisible,
}) => {
  useEffect(() => {
    // On native, trigger immediately on mount — the feature layer controls
    // re-rendering via FlatList.onEndReached
    onVisible()
  }, [onVisible])

  return <View style={{ height: 1 }} />
}

InfiniteScrollSentinel.displayName = 'InfiniteScrollSentinel'
