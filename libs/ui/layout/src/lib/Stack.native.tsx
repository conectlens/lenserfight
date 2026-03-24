/**
 * Stack.native.tsx — Flexbox layout primitive for React Native.
 *
 * The `gap` prop accepts either a numeric pixel value or a Tailwind gap class string
 * (e.g. 'gap-4') for backward compatibility with callers using the web API.
 */
import React from 'react'
import { View } from 'react-native'
import type { ViewStyle } from 'react-native'
import { gapN } from '@lenserfight/ui/tokens'

type FlexDirection  = 'vertical' | 'horizontal' | 'vertical-reverse' | 'horizontal-reverse'
type AlignItems     = 'start' | 'center' | 'end' | 'stretch' | 'baseline'
type JustifyContent = 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly'

export interface StackProps {
  direction?: FlexDirection
  gap?:       number | string
  align?:     AlignItems
  justify?:   JustifyContent
  wrap?:      boolean
  flex?:      number
  style?:     ViewStyle
  children?:  React.ReactNode
  testID?:    string
  accessible?:    boolean
  accessibilityLabel?: string
}

const dirMap: Record<FlexDirection, ViewStyle['flexDirection']> = {
  vertical:           'column',
  horizontal:         'row',
  'vertical-reverse': 'column-reverse',
  'horizontal-reverse': 'row-reverse',
}

const alignMap: Record<AlignItems, ViewStyle['alignItems']> = {
  start:    'flex-start',
  center:   'center',
  end:      'flex-end',
  stretch:  'stretch',
  baseline: 'baseline',
}

const justifyMap: Record<JustifyContent, ViewStyle['justifyContent']> = {
  start:   'flex-start',
  center:  'center',
  end:     'flex-end',
  between: 'space-between',
  around:  'space-around',
  evenly:  'space-evenly',
}

/**
 * @example
 * <Stack direction="horizontal" gap={8} align="center">
 *   <Avatar />
 *   <Text>Username</Text>
 * </Stack>
 */
export const Stack = React.forwardRef<View, StackProps>(
  (
    {
      direction = 'vertical',
      gap,
      align,
      justify,
      wrap,
      flex,
      style,
      children,
      testID,
      accessible,
      accessibilityLabel,
    },
    ref
  ) => {
    const stackStyle: ViewStyle = {
      flexDirection:  dirMap[direction],
      gap:            gapN(gap),
      alignItems:     align    ? alignMap[align]     : undefined,
      justifyContent: justify  ? justifyMap[justify] : undefined,
      flexWrap:       wrap     ? 'wrap'              : 'nowrap',
      flex,
    }

    return (
      <View
        ref={ref}
        style={[stackStyle, style]}
        testID={testID}
        accessible={accessible}
        accessibilityLabel={accessibilityLabel}
      >
        {children}
      </View>
    )
  }
)

Stack.displayName = 'Stack'
