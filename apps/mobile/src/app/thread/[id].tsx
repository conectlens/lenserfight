import { Stack, useLocalSearchParams } from 'expo-router'
import React from 'react'
import { useTranslation } from 'react-i18next'

import { ThreadDetailScreen } from '../../features/content/ThreadScreens'

export default function ThreadDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { t } = useTranslation()
  return (
    <>
      <Stack.Screen options={{ title: t('threads.detail') }} />
      <ThreadDetailScreen id={id} />
    </>
  )
}
