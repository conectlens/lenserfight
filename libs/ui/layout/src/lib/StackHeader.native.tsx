/**
 * StackHeader.native.tsx
 *
 * Adapts Expo Router / React Navigation header props to the shared
 * TopAppBar primitive. Works for both Stack (NativeStackHeaderProps) and
 * Tabs (BottomTabHeaderProps) by accepting a structural interface rather
 * than importing the concrete type from either package.
 *
 * GRASP — Adapter / Protected Variation:
 *   • navigation internals stay out of TopAppBar (Low Coupling)
 *   • iOS chevron vs Android arrow encapsulated here (Protected Variation)
 *   • same API serves both Stack and Tabs without coupling to either
 *
 * Usage:
 *   <Stack screenOptions={{ header: (props) => <StackHeader {...props} /> }}>
 *     <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
 *   </Stack>
 *
 *   <Tabs screenOptions={{ header: (props) => <StackHeader {...props} /> }} />
 *
 * Per-screen title and right action are declared in screen options — the
 * layout that owns the route is the Information Expert for its own header
 * config (GRASP — Information Expert).
 */
import { Ionicons } from '@expo/vector-icons'
import { useNativeTheme } from '@lenserfight/ui/providers/native'
import { useRouter } from 'expo-router'
import React from 'react'
import { Platform, Pressable, StyleSheet } from 'react-native'

import { TopAppBar } from './TopAppBar.native'

/** Platform-conventional back chevron. */
const BACK_ICON: 'chevron-back' | 'arrow-back' =
  Platform.OS === 'ios' ? 'chevron-back' : 'arrow-back'

const BackButton: React.FC<{ onPress: () => void; color: string }> = ({ onPress, color }) => (
  <Pressable
    onPress={onPress}
    style={styles.backHit}
    hitSlop={12}
    accessibilityLabel="Back"
    accessibilityRole="button"
  >
    <Ionicons name={BACK_ICON} size={24} color={color} />
  </Pressable>
)

/**
 * Structural interface that satisfies both NativeStackHeaderProps and
 * BottomTabHeaderProps without depending on @react-navigation packages
 * directly. Only the fields we actually use are declared.
 */
export interface StackHeaderProps {
  route: {
    name: string
  }
  options: {
    title?: string
    headerRight?: (props: { canGoBack: boolean; tintColor: string }) => React.ReactNode
  }
}

export const StackHeader: React.FC<StackHeaderProps> = ({ route, options }) => {
  const theme = useNativeTheme()
  const router = useRouter()
  const canGoBack = router.canGoBack()

  const leading = canGoBack ? (
    <BackButton onPress={() => router.back()} color={theme.active} />
  ) : undefined

  const trailing = options.headerRight?.({ canGoBack, tintColor: theme.active }) ?? undefined

  return (
    <TopAppBar
      title={options.title ?? ''}
      leading={leading}
      trailing={trailing}
      safeEdges={['top']}
    />
  )
}

StackHeader.displayName = 'StackHeader'

const styles = StyleSheet.create({
  backHit: {
    padding: 4,
  },
})
