/**
 * Field.native.tsx — Form field wrapper for React Native.
 *
 * Provides FieldLabel, FieldHint, FieldError sub-components and the Field container.
 */
import React, { useId } from 'react'
import { View, StyleSheet } from 'react-native'
import type { ViewStyle } from 'react-native'
import { Text } from '@lenserfight/ui/primitives'
import { useNativeTheme } from '@lenserfight/ui/providers'

// ── FieldLabel ───────────────────────────────────────────────────────────────

export interface FieldLabelProps {
  children: React.ReactNode
  required?: boolean
}

export const FieldLabel: React.FC<FieldLabelProps> = ({ children, required }) => {
  const { surface } = useNativeTheme()
  return (
    <Text variant="bodyS" weight="medium" style={{ color: surface.text, marginBottom: 4 }}>
      {children}{required && <Text variant="bodyS" style={{ color: '#ea3942' }}> *</Text>}
    </Text>
  )
}

// ── FieldHint ────────────────────────────────────────────────────────────────

export interface FieldHintProps {
  children: React.ReactNode
}

export const FieldHint: React.FC<FieldHintProps> = ({ children }) => (
  <Text variant="caption" color="muted" style={{ marginTop: 4 }}>
    {children}
  </Text>
)

// ── FieldError ───────────────────────────────────────────────────────────────

export interface FieldErrorProps {
  children?: React.ReactNode
}

export const FieldError: React.FC<FieldErrorProps> = ({ children }) => {
  if (!children) return null
  return (
    <Text variant="caption" color="error" style={{ marginTop: 4 }}>
      {children}
    </Text>
  )
}

// ── Field ─────────────────────────────────────────────────────────────────────

export interface FieldProps {
  label?:    string
  hint?:     string
  error?:    string
  required?: boolean
  style?:    ViewStyle
  children:  React.ReactNode
}

/**
 * @example
 * <Field label="Email" error={errors.email} required>
 *   <Input placeholder="you@example.com" error={!!errors.email} />
 * </Field>
 */
export const Field: React.FC<FieldProps> = ({
  label,
  hint,
  error,
  required,
  style,
  children,
}) => {
  return (
    <View style={[styles.field, style]}>
      {label && <FieldLabel required={required}>{label}</FieldLabel>}
      {children}
      {hint && !error && <FieldHint>{hint}</FieldHint>}
      {error && <FieldError>{error}</FieldError>}
    </View>
  )
}

Field.displayName      = 'Field'
FieldLabel.displayName = 'FieldLabel'
FieldHint.displayName  = 'FieldHint'
FieldError.displayName = 'FieldError'

const styles = StyleSheet.create({
  field: {
    marginBottom: 16,
  },
})
