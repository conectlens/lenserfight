import { Stack, useLocalSearchParams } from 'expo-router'
import React from 'react'
import { useTranslation } from 'react-i18next'

import { TagDetailScreen } from '../../features/content/TagScreens'

export default function TagDetailRoute() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const { t } = useTranslation()
  return (
    <>
      <Stack.Screen options={{ title: t('tags.detail') }} />
      <TagDetailScreen slug={slug} />
    </>
  )
}
