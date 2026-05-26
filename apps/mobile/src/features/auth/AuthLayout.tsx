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
 *
 * Changes from the previous version:
 * - SafeAreaContainer removed: the sheet provides safe-area and
 *   keyboard-avoidance via KeyboardAvoidingView + useSafeAreaInsets.
 * - "LF" text mark replaced with MobileLogo (brand logo + wordmark).
 * - No outer card/surface rounding: the sheet itself provides the surface.
 * - Flat vertical stack; gap uses spacing tokens.
 *
 * GRASP / Low Coupling: layout concerns (safe-area, scroll, backdrop) belong
 * to AuthSheet; this component only owns form composition.
 */
export const AuthLayout: React.FC<AuthLayoutProps> = ({ title, subtitle, children }) => {
  const { t } = useTranslation()
  const { spacing } = useNativeTheme()

  return (
    <View style={styles.container} testID="auth-layout">
      {/* Brand identity — logo mark + wordmark */}
      <View style={[styles.brand, { marginBottom: spacing[3] }]}>
        <MobileLogo size={44} showWordmark orientation="vertical" />
        <Text variant="caption" color="muted" align="center">
          {t('app.tagline')}
        </Text>
      </View>

      {/* Form section */}
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
  container: {
    // Not flex:1 — grows with content inside the sheet's ScrollView
  },
  brand: {
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  form: {
    // gap is set inline via spacing token
  },
  subtitle: {
    marginBottom: 4,
  },
})
