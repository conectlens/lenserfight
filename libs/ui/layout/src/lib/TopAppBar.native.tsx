/**
 * TopAppBar.native.tsx — App bar / header for React Native.
 *
 * Wraps in SafeAreaView to account for status bar and notch.
 * Provides leading (back), title, and trailing (actions) slots.
 */
import React from 'react'
import { Platform, StyleSheet, View } from 'react-native'
import { SafeAreaView, type Edge } from 'react-native-safe-area-context'
import type { ViewStyle } from 'react-native'
import { useNativeTheme } from '@lenserfight/ui/providers/native'
import { Text } from '@lenserfight/ui/primitives/native'

export interface TopAppBarProps {
  title?:    string
  subtitle?: string
  /** Leading slot — typically a back button (IconButton) */
  leading?:  React.ReactNode
  /** Trailing slot — actions row */
  trailing?: React.ReactNode
  /** Replace the title string with a custom node */
  titleNode?: React.ReactNode
  style?:    ViewStyle
  testID?:   string
  /**
   * Safe-area edges to apply. Defaults to ['top'] which is correct for an
   * app bar positioned at the top of the screen.
   */
  safeEdges?: Edge[]
}

/**
 * @example
 * <TopAppBar
 *   leading={<IconButton onPress={goBack} icon={<ArrowLeft />} accessibilityLabel="Back" />}
 *   title="Arena"
 *   trailing={<IconButton onPress={openMenu} icon={<MoreIcon />} accessibilityLabel="Menu" />}
 * />
 */
export const TopAppBar: React.FC<TopAppBarProps> = ({
  title,
  subtitle,
  leading,
  trailing,
  titleNode,
  style,
  testID,
  safeEdges = ['top'],
}) => {
  const { surface } = useNativeTheme()
  const borderStyle: ViewStyle = {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: surface.border,
  }

  return (
    <SafeAreaView edges={safeEdges} style={[{ backgroundColor: surface.base }, borderStyle, style]} testID={testID}>
      <View style={styles.bar}>
        {/* Leading */}
        <View style={styles.slot}>{leading}</View>

        {/* Title */}
        <View style={styles.titleSlot}>
          {titleNode ?? (
            <>
              {title && (
                <Text variant="h4" weight="semibold" align="center" numberOfLines={1}>
                  {title}
                </Text>
              )}
              {subtitle && (
                <Text variant="caption" color="muted" align="center" numberOfLines={1}>
                  {subtitle}
                </Text>
              )}
            </>
          )}
        </View>

        {/* Trailing */}
        <View style={[styles.slot, styles.trailingSlot]}>{trailing}</View>
      </View>
    </SafeAreaView>
  )
}

TopAppBar.displayName = 'TopAppBar'

const BAR_HEIGHT = 56

const styles = StyleSheet.create({
  bar: {
    height:         BAR_HEIGHT,
    flexDirection:  'row',
    alignItems:     'center',
    paddingHorizontal: 4,
  },
  slot: {
    width:          56,
    alignItems:     'center',
    justifyContent: 'center',
  },
  trailingSlot: {
    alignItems: 'flex-end',
  },
  titleSlot: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
  },
})
