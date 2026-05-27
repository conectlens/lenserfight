import { Pressable, Text } from '@lenserfight/ui/primitives/native'
import { WEB_BASE_URL } from '@lenserfight/utils/env'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Linking, StyleSheet, View } from 'react-native'

export const PrivacyNotice: React.FC = () => {
  const { t } = useTranslation()
  return (
    <View style={styles.privacyRow}>
      <Text variant="caption" color="muted">
        {t('auth.privacyNotice')}{' '}
      </Text>
      <Pressable
        onPress={() => Linking.openURL(`${WEB_BASE_URL}/privacy`)}
        accessibilityRole="link"
      >
        <Text variant="caption" color="muted" style={styles.link}>
          {t('auth.privacy')}
        </Text>
      </Pressable>
      <Text variant="caption" color="muted">
        {' '}
        &{' '}
      </Text>
      <Pressable onPress={() => Linking.openURL(`${WEB_BASE_URL}/terms`)} accessibilityRole="link">
        <Text variant="caption" color="muted" style={styles.link}>
          {t('auth.terms')}
        </Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  privacyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 12,
  },
  link: {
    textDecorationLine: 'underline',
  },
})
