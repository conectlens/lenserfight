import React from 'react'
import { StyleSheet, View } from 'react-native'
import { KeyboardAvoidingFormLayout, SafeAreaContainer } from '@lenserfight/ui/layout/native'
import { Surface, Text } from '@lenserfight/ui/primitives/native'
import { useNativeTheme } from '@lenserfight/ui/providers/native'
import { useTranslation } from 'react-i18next'

interface AuthLayoutProps {
  title: string
  subtitle: string
  children: React.ReactNode
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ title, subtitle, children }) => {
  const { t } = useTranslation()
  const { spacing, radius } = useNativeTheme()

  return (
    <SafeAreaContainer testID="auth-layout">
      <KeyboardAvoidingFormLayout contentStyle={[styles.content, { padding: spacing[4] }]}>
        <View style={styles.brand}>
          <Surface borderRadius={radius.full} style={styles.mark}>
            <Text variant="h2" weight="bold">
              LF
            </Text>
          </Surface>
          <Text variant="h2" weight="bold" align="center">
            {t('app.name')}
          </Text>
          <Text variant="bodyM" color="muted" align="center">
            {t('app.tagline')}
          </Text>
        </View>

        <Surface borderRadius={radius.xl} style={[styles.card, { padding: spacing[5] }]}>
          <Text variant="h2" weight="bold">
            {title}
          </Text>
          <Text variant="bodyM" color="muted" style={styles.subtitle}>
            {subtitle}
          </Text>
          {children}
        </Surface>
      </KeyboardAvoidingFormLayout>
    </SafeAreaContainer>
  )
}

const styles = StyleSheet.create({
  brand: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
    marginTop: 12,
  },
  card: {
    gap: 12,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  mark: {
    alignItems: 'center',
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  subtitle: {
    marginBottom: 8,
  },
})
