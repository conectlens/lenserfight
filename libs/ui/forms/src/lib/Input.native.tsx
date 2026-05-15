/**
 * Input.native.tsx — Text input for React Native.
 *
 * Neumorphic inset shadow on focus via Animated.Value interpolation.
 * Matches the InputProps interface from the web version.
 */
import React, { useRef, useCallback } from 'react'
import {
  TextInput,
  View,
  Animated,
  StyleSheet,
  Platform,
} from 'react-native'
import type { TextInputProps, ViewStyle } from 'react-native'
import { useNativeTheme } from '@lenserfight/ui/providers'

export interface InputProps extends Omit<TextInputProps, 'style'> {
  error?:           boolean
  disabled?:        boolean
  startAdornment?:  React.ReactNode
  endAdornment?:    React.ReactNode
  style?:           ViewStyle
}

/**
 * @example
 * <Input placeholder="Enter username" error={!!errors.username} />
 * <Input startAdornment={<SearchIcon />} placeholder="Search…" />
 */
export const Input = React.forwardRef<TextInput, InputProps>(
  (
    {
      error,
      startAdornment,
      endAdornment,
      style,
      disabled,
      onFocus,
      onBlur,
      editable,
      ...props
    },
    ref
  ) => {
    const { surface, active, spacing, radius } = useNativeTheme()
    const isDisabled = disabled || editable === false
    const focusAnim = useRef(new Animated.Value(0)).current

    const handleFocus = useCallback(
      (e: any) => {
        Animated.timing(focusAnim, { toValue: 1, duration: 150, useNativeDriver: false }).start()
        onFocus?.(e)
      },
      [focusAnim, onFocus]
    )

    const handleBlur = useCallback(
      (e: any) => {
        Animated.timing(focusAnim, { toValue: 0, duration: 150, useNativeDriver: false }).start()
        onBlur?.(e)
      },
      [focusAnim, onBlur]
    )

    const borderColor = focusAnim.interpolate({
      inputRange:  [0, 1],
      outputRange: [
        error ? '#ea3942' : surface.border,
        error ? '#ea3942' : active,
      ],
    })

    const shadowStyle = Platform.OS === 'ios'
      ? {
          shadowColor:   '#000',
          shadowOffset:  { width: 2, height: 2 },
          shadowOpacity: focusAnim.interpolate({ inputRange: [0, 1], outputRange: [0.07, 0] }),
          shadowRadius:  5,
        }
      : {}

    const containerStyle: ViewStyle = {
      flexDirection:     'row',
      alignItems:        'center',
      backgroundColor:   surface.raised,
      borderRadius:      radius.xl,
      borderWidth:       1,
      paddingHorizontal: spacing[3.5] ?? 14,
      paddingVertical:   spacing[2.5] ?? 10,
      opacity:           isDisabled ? 0.5 : 1,
    }

    return (
      <Animated.View
        style={[
          containerStyle,
          { borderColor },
          Platform.OS === 'ios' ? shadowStyle : undefined,
          style,
        ]}
      >
        {startAdornment && (
          <View style={styles.adornment}>{startAdornment}</View>
        )}

        <TextInput
          ref={ref}
          editable={!isDisabled}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholderTextColor={surface.textMuted}
          style={[
            styles.input,
            {
              color:      surface.text,
              flex:       1,
              fontSize:   14,
              fontFamily: 'Inter',
            },
          ]}
          {...props}
        />

        {endAdornment && (
          <View style={styles.adornment}>{endAdornment}</View>
        )}
      </Animated.View>
    )
  }
)

Input.displayName = 'Input'

const styles = StyleSheet.create({
  input: {
    padding: 0,  // Remove default TextInput padding
    margin:  0,
  },
  adornment: {
    marginHorizontal: 4,
  },
})
