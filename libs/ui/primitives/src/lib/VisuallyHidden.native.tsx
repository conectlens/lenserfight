/**
 * VisuallyHidden.native.tsx — Accessibility-only content for React Native.
 *
 * On native, truly hiding from sighted users while exposing to screen readers
 * requires positioning outside the visible viewport.
 */
import React from 'react'
import { View, StyleSheet } from 'react-native'

export interface VisuallyHiddenProps {
  children: React.ReactNode
}

/**
 * Renders children that are only visible to screen readers.
 *
 * @example
 * <VisuallyHidden>
 *   <Text>Close dialog</Text>
 * </VisuallyHidden>
 */
export const VisuallyHidden: React.FC<VisuallyHiddenProps> = ({ children }) => {
  return (
    <View
      style={styles.hidden}
      accessibilityElementsHidden={false}
      importantForAccessibility="yes"
    >
      {children}
    </View>
  )
}

VisuallyHidden.displayName = 'VisuallyHidden'

const styles = StyleSheet.create({
  hidden: {
    position: 'absolute',
    width:    1,
    height:   1,
    overflow: 'hidden',
    opacity:  0,
  },
})
