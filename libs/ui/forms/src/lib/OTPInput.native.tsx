/**
 * OTPInput.native.tsx — OTP / PIN input for React Native (mobile-only).
 *
 * Renders N individual TextInput cells with auto-advance on input.
 * Backspace on an empty cell moves focus to the previous cell.
 */
import React, { useRef, useCallback } from 'react'
import { TextInput, View, StyleSheet } from 'react-native'
import type { ViewStyle } from 'react-native'
import { useNativeTheme } from '@lenserfight/ui/providers/native'
import { Text } from '@lenserfight/ui/primitives/native'

export interface OTPInputProps {
  value: string
  onChange: (value: string) => void
  length?: number
  secure?: boolean
  error?: string
  autoFocus?: boolean
  style?: ViewStyle
  onComplete?: (value: string) => void
}

const CELL_SIZE = 48

/**
 * @example
 * <OTPInput value={code} onChange={setCode} length={6} onComplete={verify} />
 */
export const OTPInput: React.FC<OTPInputProps> = ({
  value,
  onChange,
  length = 6,
  secure,
  error,
  autoFocus,
  style,
  onComplete,
}) => {
  const { surface, active, radius } = useNativeTheme()
  const refs = useRef<(TextInput | null)[]>([])

  const chars = value.split('').slice(0, length)
  while (chars.length < length) chars.push('')

  const handleChange = useCallback(
    (text: string, index: number) => {
      // Accept only the last typed character
      const char = text.slice(-1)
      const next = chars.map((c, i) => (i === index ? char : c))
      const newValue = next.join('')
      onChange(newValue)

      if (char && index < length - 1) {
        refs.current[index + 1]?.focus()
      }

      if (newValue.length === length) {
        onComplete?.(newValue)
      }
    },
    [chars, length, onChange, onComplete]
  )

  const handleKeyPress = useCallback(
    (key: string, index: number) => {
      if (key === 'Backspace' && !chars[index] && index > 0) {
        refs.current[index - 1]?.focus()
        const next = chars.map((c, i) => (i === index - 1 ? '' : c))
        onChange(next.join(''))
      }
    },
    [chars, onChange]
  )

  return (
    <View style={style}>
      <View style={styles.row}>
        {chars.map((char, index) => {
          const isFocused = false // tracked via ref in real impl
          return (
            <TextInput
              key={index}
              ref={(el) => {
                refs.current[index] = el
              }}
              value={char}
              onChangeText={(text) => handleChange(text, index)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
              maxLength={1}
              keyboardType="number-pad"
              secureTextEntry={secure}
              autoFocus={autoFocus && index === 0}
              selectTextOnFocus
              style={[
                styles.cell,
                {
                  borderRadius: radius.lg,
                  borderColor: error ? '#ea3942' : char ? active : surface.border,
                  backgroundColor: surface.raised,
                  color: surface.text,
                  fontFamily: 'Inter',
                },
              ]}
              accessible
              accessibilityLabel={`Digit ${index + 1} of ${length}`}
            />
          )
        })}
      </View>
      {error && (
        <Text variant="caption" color="error" align="center" style={{ marginTop: 8 }}>
          {error}
        </Text>
      )}
    </View>
  )
}

OTPInput.displayName = 'OTPInput'

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderWidth: 2,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '600',
  },
})
