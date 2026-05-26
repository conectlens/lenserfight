import { Stack, useLocalSearchParams } from 'expo-router'
import React from 'react'
import { useTranslation } from 'react-i18next'

import { LensDetailScreen } from '../../features/content/LensScreens'

export default function LensDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { t } = useTranslation()
  return (
    <>
      <Stack.Screen options={{ title: t('lenses.detail') }} />
      <LensDetailScreen id={id} />
    </>
  )
}
