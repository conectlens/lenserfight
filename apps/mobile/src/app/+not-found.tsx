import { Link, Stack } from 'expo-router'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

import { Text } from '@lenserfight/ui/primitives/native'

export default function NotFoundScreen() {
  const { t } = useTranslation()

  return (
    <>
      <Stack.Screen options={{ title: t('states.notFound') }} />
      <View style={styles.container}>
        <Text variant="headingM">{t('states.notFound')}</Text>
        <Link href="/" style={styles.link}>
          <Text variant="bodyM" color="accent">
            {t('actions.goHome')}
          </Text>
        </Link>
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 16,
  },
  link: {
    paddingVertical: 8,
  },
})
