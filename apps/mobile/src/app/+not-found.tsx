import { Text } from '@lenserfight/ui/primitives/native'
import { useNativeTheme } from '@lenserfight/ui/providers/native'
import { Link, Stack } from 'expo-router'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

export default function NotFoundScreen() {
  const { t } = useTranslation()
  const theme = useNativeTheme()

  return (
    <>
      <Stack.Screen options={{ title: t('states.notFound') }} />
      <View style={[styles.container, { backgroundColor: theme.surface.base }]}>
        <Text variant="h3">{t('states.notFound')}</Text>
        <Link href="/" style={styles.link}>
          <Text variant="bodyM" color="active">
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
