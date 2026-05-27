import { MobileLogo } from '@lenserfight/ui/components/native'
import { Text } from '@lenserfight/ui/primitives/native'
import { useNativeTheme } from '@lenserfight/ui/providers/native'
import React from 'react'
import { StyleSheet, View } from 'react-native'

interface AuthLayoutProps {
  title: string
  subtitle: string
  children: React.ReactNode
}

/**
 * Inner auth form layout — designed to live inside AuthSheet, not as a
 * full-screen surface.
 */
export const AuthLayout: React.FC<AuthLayoutProps> = ({ title, subtitle, children }) => {
  const { spacing } = useNativeTheme()

  return (
    <View style={styles.container} testID="auth-layout">
      <View style={[styles.brand, { marginBottom: spacing[2] }]}>
        <MobileLogo size={32} showWordmark orientation="horizontal" />
      </View>

      <View style={[styles.form, { gap: spacing[3] }]}>
        <Text variant="h2" weight="bold">
          {title}
        </Text>
        <Text variant="bodyM" color="muted" style={styles.subtitle}>
          {subtitle}
        </Text>
        {children}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {},
  brand: {
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  form: {},
  subtitle: {
    marginBottom: 4,
  },
})
