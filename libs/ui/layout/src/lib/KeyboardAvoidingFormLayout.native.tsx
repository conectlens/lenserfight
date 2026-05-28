/**
 * KeyboardAvoidingFormLayout.native.tsx — Keyboard-safe form wrapper (mobile-only).
 *
 * Wraps form content in KeyboardAvoidingView with the correct behavior per platform:
 * - iOS:     'padding' (shifts content up)
 * - Android: 'height' (shrinks the view)
 *
 * Use inside a Screen component that occupies the full safe area.
 */
import React from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native'
import type { ViewStyle } from 'react-native'

export interface KeyboardAvoidingFormLayoutProps {
  children:          React.ReactNode
  /** Scroll the form content inside a ScrollView (recommended for long forms). Default: true */
  scrollable?:       boolean
  style?:            ViewStyle
  contentStyle?:     ViewStyle
  keyboardVerticalOffset?: number
}

/**
 * @example
 * <KeyboardAvoidingFormLayout>
 *   <Field label="Email">
 *     <Input placeholder="you@example.com" keyboardType="email-address" />
 *   </Field>
 *   <Button onPress={submit}>Sign in</Button>
 * </KeyboardAvoidingFormLayout>
 */
export const KeyboardAvoidingFormLayout: React.FC<KeyboardAvoidingFormLayoutProps> = ({
  children,
  scrollable = true,
  style,
  contentStyle,
  keyboardVerticalOffset = Platform.OS === 'ios' ? 64 : 0,
}) => {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={keyboardVerticalOffset}
      style={[styles.root, style]}
    >
      {scrollable ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, contentStyle]}
        >
          {children}
        </ScrollView>
      ) : (
        children
      )}
    </KeyboardAvoidingView>
  )
}

KeyboardAvoidingFormLayout.displayName = 'KeyboardAvoidingFormLayout'

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flexGrow:          1,
    padding:           16,
    paddingBottom:     32,
  },
})
