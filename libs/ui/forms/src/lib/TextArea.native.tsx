/**
 * TextArea.native.tsx — Multiline text input for React Native.
 */
import React from 'react'
import { TextInput, View, StyleSheet } from 'react-native'
import type { TextInputProps, ViewStyle } from 'react-native'
import { useNativeTheme } from '@lenserfight/ui/providers'

export interface TextAreaProps extends Omit<TextInputProps, 'style' | 'multiline'> {
  error?:        boolean
  disabled?:     boolean
  numberOfLines?: number
  style?:        ViewStyle
}

/**
 * @example
 * <TextArea placeholder="Describe your take…" numberOfLines={4} />
 */
export const TextArea = React.forwardRef<TextInput, TextAreaProps>(
  ({ error, numberOfLines = 4, style, editable, disabled, ...props }, ref) => {
    const { surface, radius } = useNativeTheme()
    const isDisabled = disabled || editable === false

    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: surface.raised,
            borderColor:     error ? '#ea3942' : surface.border,
            borderRadius:    radius.xl,
            opacity:         isDisabled ? 0.5 : 1,
          },
          style,
        ]}
      >
        <TextInput
          ref={ref}
          multiline
          numberOfLines={numberOfLines}
          editable={!isDisabled}
          placeholderTextColor={surface.textMuted}
          style={[
            styles.input,
            {
              color:      surface.text,
              fontSize:   14,
              fontFamily: 'Inter',
              minHeight:  numberOfLines * 22,
            },
          ]}
          textAlignVertical="top"
          {...props}
        />
      </View>
    )
  }
)

TextArea.displayName = 'TextArea'

const styles = StyleSheet.create({
  container: {
    borderWidth:       1,
    padding:           12,
  },
  input: {
    padding: 0,
    margin:  0,
  },
})
