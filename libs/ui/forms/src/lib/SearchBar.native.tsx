/**
 * SearchBar.native.tsx — Search input for React Native.
 */
import React, { useRef, useCallback } from 'react'
import { TextInput, View, Animated, StyleSheet, Pressable } from 'react-native'
import type { TextInputProps, ViewStyle } from 'react-native'
import { useNativeTheme } from '@lenserfight/ui/providers'
import { Text } from '@lenserfight/ui/primitives'

export interface SearchBarProps extends Omit<TextInputProps, 'style'> {
  value:          string
  onChangeText:   (text: string) => void
  onSearch?:      () => void
  onClear?:       () => void
  placeholder?:   string
  loading?:       boolean
  style?:         ViewStyle
}

/**
 * @example
 * <SearchBar value={query} onChangeText={setQuery} onSearch={search} placeholder="Search lenses…" />
 */
export const SearchBar = React.forwardRef<TextInput, SearchBarProps>(
  (
    {
      value,
      onChangeText,
      onSearch,
      onClear,
      placeholder = 'Search…',
      loading,
      style,
      onFocus,
      onBlur,
      ...props
    },
    ref
  ) => {
    const { surface, active, radius } = useNativeTheme()
    const focusAnim = useRef(new Animated.Value(0)).current

    const handleFocus = useCallback((e: any) => {
      Animated.timing(focusAnim, { toValue: 1, duration: 150, useNativeDriver: false }).start()
      onFocus?.(e)
    }, [focusAnim, onFocus])

    const handleBlur = useCallback((e: any) => {
      Animated.timing(focusAnim, { toValue: 0, duration: 150, useNativeDriver: false }).start()
      onBlur?.(e)
    }, [focusAnim, onBlur])

    const borderColor = focusAnim.interpolate({
      inputRange:  [0, 1],
      outputRange: [surface.border, active],
    })

    return (
      <Animated.View
        style={[
          styles.container,
          {
            backgroundColor: surface.raised,
            borderRadius:    radius['2xl'],
            borderColor,
          },
          style,
        ]}
      >
        {/* Search icon placeholder — replace with SVG icon in production */}
        <Text variant="bodyM" style={{ marginRight: 8, color: surface.textMuted }}>⌕</Text>

        <TextInput
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          placeholderTextColor={surface.textMuted}
          returnKeyType="search"
          onSubmitEditing={onSearch}
          clearButtonMode="while-editing"
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.input, { color: surface.text }]}
          {...props}
        />

        {/* Manual clear button for Android */}
        {value.length > 0 && !loading && (
          <Pressable onPress={() => { onChangeText(''); onClear?.() }} style={styles.clearBtn}>
            <Text variant="bodyM" style={{ color: surface.textMuted }}>✕</Text>
          </Pressable>
        )}
      </Animated.View>
    )
  }
)

SearchBar.displayName = 'SearchBar'

const styles = StyleSheet.create({
  container: {
    flexDirection:  'row',
    alignItems:     'center',
    borderWidth:    1,
    paddingHorizontal: 12,
    paddingVertical:   8,
  },
  input: {
    flex:       1,
    fontSize:   14,
    fontFamily: 'Inter',
    padding:    0,
    margin:     0,
  },
  clearBtn: {
    marginLeft:  4,
    padding:     4,
  },
})
