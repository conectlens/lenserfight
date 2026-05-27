import { MobileLogo } from '@lenserfight/ui/components/native'
import { Text } from '@lenserfight/ui/primitives/native'
import { useNativeTheme } from '@lenserfight/ui/providers/native'
import React from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
  const { spacing } = useNativeTheme()

  return (
    <View style={styles.container} testID="auth-layout">
      <View style={[styles.brand, { marginBottom: spacing[3] }]}>
        <MobileLogo size={44} showWordmark orientation="vertical" />
        <Text variant="caption" color="muted" align="center">
          {t('app.tagline')}
        </Text>
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
