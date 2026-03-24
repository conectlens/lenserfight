/**
 * OfflineBanner.native.tsx — Offline status banner for React Native.
 *
 * Accepts `isOffline: boolean` as a prop — avoids the @react-native-community/netinfo
 * dependency. The feature layer is responsible for detecting connectivity status.
 */
import React from 'react'
import { View, StyleSheet } from 'react-native'
import { Text } from '@lenserfight/ui/primitives'

export interface OfflineBannerProps {
  /** Pass true when the device is offline. The banner renders null when false. */
  isOffline: boolean
  message?:  string
}

/**
 * @example
 * const isOffline = !useNetworkStatus() // from feature layer
 * <OfflineBanner isOffline={isOffline} />
 */
export const OfflineBanner: React.FC<OfflineBannerProps> = ({
  isOffline,
  message = 'You are offline. Some features may be unavailable.',
}) => {
  if (!isOffline) return null

  return (
    <View style={styles.banner} accessible accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Text variant="caption" weight="medium" style={{ color: '#ffffff' }} align="center">
        {message}
      </Text>
    </View>
  )
}

OfflineBanner.displayName = 'OfflineBanner'

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#ea3942',
    paddingVertical:   8,
    paddingHorizontal: 16,
    alignItems:        'center',
  },
})
