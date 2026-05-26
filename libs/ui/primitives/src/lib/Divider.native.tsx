/**
 * Divider.native.tsx — Visual separator for React Native.
 */
import React from 'react'
import { View } from 'react-native'
import type { ViewStyle } from 'react-native'
import { useNativeTheme } from '@lenserfight/ui/providers/native'

export interface DividerProps {
  orientation?: 'horizontal' | 'vertical'
  style?: ViewStyle
}

/**
 * @example
 * <Divider orientation="horizontal" />
 */
export const Divider: React.FC<DividerProps> = ({ orientation = 'horizontal', style }) => {
  const { surface } = useNativeTheme()

  const lineStyle: ViewStyle =
    orientation === 'horizontal'
      ? { height: 1, width: '100%', backgroundColor: surface.border }
      : { width: 1, alignSelf: 'stretch', backgroundColor: surface.border }

  return <View style={[lineStyle, style]} accessibilityRole="none" />
}

Divider.displayName = 'Divider'
