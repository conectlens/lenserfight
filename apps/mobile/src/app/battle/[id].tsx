import { Stack, useLocalSearchParams } from 'expo-router'
import React from 'react'
import { useTranslation } from 'react-i18next'

import { BattleDetailScreen } from '../../features/content/BattleScreens'

export default function BattleDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { t } = useTranslation()
  return (
    <>
      <Stack.Screen options={{ title: t('battles.detail') }} />
      <BattleDetailScreen id={id} />
    </>
  )
}
