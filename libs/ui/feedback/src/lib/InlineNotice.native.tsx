/**
 * InlineNotice.native.tsx — Inline notice / alert for React Native.
 */
import React from 'react'
import { View, StyleSheet } from 'react-native'
import type { ViewStyle } from 'react-native'
import { useNativeTheme } from '@lenserfight/ui/providers'
import { Text } from '@lenserfight/ui/primitives'
import { Pressable } from '@lenserfight/ui/primitives'

export type NoticeVariant = 'info' | 'success' | 'warning' | 'error' | 'neutral'

export interface InlineNoticeProps {
  variant?:   NoticeVariant
  title?:     string
  message:    string
  onDismiss?: () => void
  icon?:      React.ReactNode
  action?:    { label: string; onPress: () => void }
  style?:     ViewStyle
}

const variantStyles: Record<NoticeVariant, { bg: string; border: string; text: string }> = {
  info:    { bg: 'rgba(40,123,255,0.1)',  border: '#287bff', text: '#287bff' },
  success: { bg: 'rgba(46,183,115,0.1)', border: '#2eb773', text: '#2eb773' },
  warning: { bg: 'rgba(255,222,89,0.15)',border: '#e8c645', text: '#c9a935' },
  error:   { bg: 'rgba(234,57,66,0.1)',  border: '#ea3942', text: '#ea3942' },
  neutral: { bg: 'rgba(166,167,170,0.1)',border: '#a6a7aa', text: '#6a6b6e' },
}

/**
 * @example
 * <InlineNotice variant="warning" message="Your submission is under review." />
 */
export const InlineNotice: React.FC<InlineNoticeProps> = ({
  variant  = 'neutral',
  title,
  message,
  onDismiss,
  icon,
  action,
  style,
}) => {
  const { radius } = useNativeTheme()
  const vs = variantStyles[variant]

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: vs.bg,
          borderColor:     vs.border,
          borderRadius:    radius.lg,
        },
        style,
      ]}
      accessible
      accessibilityRole="alert"
    >
      <View style={styles.content}>
        {icon && <View style={styles.icon}>{icon}</View>}
        <View style={styles.text}>
          {title && (
            <Text variant="bodyS" weight="semibold" style={{ color: vs.text }}>
              {title}
            </Text>
          )}
          <Text variant="bodyS" style={{ color: vs.text }}>{message}</Text>
          {action && (
            <Pressable onPress={action.onPress} accessibilityLabel={action.label} style={{ marginTop: 4 }}>
              <Text variant="bodyS" weight="semibold" style={{ color: vs.text, textDecorationLine: 'underline' }}>
                {action.label}
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      {onDismiss && (
        <Pressable onPress={onDismiss} accessibilityLabel="Dismiss" style={styles.dismiss}>
          <Text variant="bodyM" style={{ color: vs.text }}>✕</Text>
        </Pressable>
      )}
    </View>
  )
}

InlineNotice.displayName = 'InlineNotice'

const styles = StyleSheet.create({
  container: {
    borderWidth:    1,
    padding:        12,
    flexDirection:  'row',
    alignItems:     'flex-start',
  },
  content: {
    flex:           1,
    flexDirection:  'row',
    alignItems:     'flex-start',
  },
  icon: {
    marginRight:    8,
    marginTop:      1,
  },
  text: {
    flex: 1,
  },
  dismiss: {
    marginLeft:     8,
    padding:        4,
  },
})
