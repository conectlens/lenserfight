/**
 * SafeAreaContainer.native.tsx — SafeAreaView wrapper with theme background (mobile-only).
 *
 * Wraps children in SafeAreaView with the semantic base background color.
 * Use as the root wrapper for all screen content.
 */
import React from 'react'
import { SafeAreaView, StyleSheet, View } from 'react-native'
import type { ViewStyle } from 'react-native'
import { useNativeTheme } from '@lenserfight/ui/providers'

export interface SafeAreaContainerProps {
  children:   React.ReactNode
  /** Apply safe area to specific edges only */
  edges?:     ('top' | 'bottom' | 'left' | 'right')[]
  style?:     ViewStyle
  testID?:    string
}

/**
 * @example
 * // Screen root — fills the full safe area
 * <SafeAreaContainer>
 *   <ScreenContent />
 * </SafeAreaContainer>
 */
export const SafeAreaContainer: React.FC<SafeAreaContainerProps> = ({
  children,
  style,
  testID,
}) => {
  const { surface } = useNativeTheme()

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: surface.base }, style]} testID={testID}>
      {children}
    </SafeAreaView>
  )
}

SafeAreaContainer.displayName = 'SafeAreaContainer'

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
})
