import React from 'react'
import { StyleSheet, View } from 'react-native'
import { Text } from '@lenserfight/ui/primitives/native'
import { useTranslation } from 'react-i18next'
import { MobileButton } from '../../ui/MobileButton'

type Provider = 'google' | 'github' | 'apple'

interface OAuthButtonsProps {
  disabled?: boolean
  loading?: boolean
  onOAuth: (provider: Provider) => void
}

export const OAuthButtons: React.FC<OAuthButtonsProps> = ({ disabled, loading, onOAuth }) => {
  const { t } = useTranslation()
  return (
    <View style={styles.wrap}>
      <Text variant="caption" color="muted" align="center">
        {t('auth.oauthDivider')}
      </Text>
      <View style={styles.grid}>
        <MobileButton
          label={t('auth.google')}
          onPress={() => onOAuth('google')}
          variant="secondary"
          disabled={disabled}
          loading={loading}
          testID="oauth-google"
        />
        <MobileButton
          label={t('auth.github')}
          onPress={() => onOAuth('github')}
          variant="secondary"
          disabled={disabled}
          loading={loading}
          testID="oauth-github"
        />
      </View>
      <MobileButton
        label={t('auth.apple')}
        onPress={() => onOAuth('apple')}
        variant="secondary"
        disabled={disabled}
        loading={loading}
        testID="oauth-apple"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    gap: 10,
  },
  wrap: {
    gap: 10,
    marginTop: 8,
  },
})
