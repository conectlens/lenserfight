import {
  DetailSection,
  EmptyContentState,
  ErrorState,
  LoadingState,
  MobileButton,
} from '@lenserfight/ui/components/native'
import { SafeAreaContainer } from '@lenserfight/ui/layout/native'
import { Chip, Text } from '@lenserfight/ui/primitives/native'
import { ARENA_BASE_URL } from '@lenserfight/utils/env'
import { Stack, useLocalSearchParams } from 'expo-router'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Linking, ScrollView, View } from 'react-native'

import { useBattleDetail } from '../../hooks/useMobileContent'
import { getBattleTypeLabel } from '../../utils/battleTypeLabel'
import { screenStyles } from '../../styles/screenStyles'

const STATUS_LABELS: Record<string, string> = {
  pending: 'pending',
  active: 'active',
  voting: 'voting',
  judging: 'judging',
  completed: 'completed',
}

export default function BattleDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { t } = useTranslation()
  const query = useBattleDetail(id)
  const battle = query.data

  const openOnWeb = () => {
    Linking.openURL(`${ARENA_BASE_URL}/battles/${id}`)
  }

  return (
    <>
      <Stack.Screen options={{ title: t('battles.detail') }} />
      <SafeAreaContainer testID="battle-detail-screen">
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={screenStyles.scroll}
        >
          {query.isLoading && <LoadingState label={t('states.loading')} />}
          {query.isError && (
            <ErrorState
              message={query.error.message}
              fallbackMessage={t('states.error')}
              retryLabel={t('states.retry')}
              onRetry={() => query.refetch()}
            />
          )}
          {!query.isLoading && !query.isError && !battle && (
            <EmptyContentState title={t('states.empty')} description={t('states.notFound')} />
          )}
          {battle && (
            <>
              <DetailSection title={battle.title}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Chip
                    label={t(
                      `battles.status.${STATUS_LABELS[battle.status] ?? battle.status}`,
                      battle.status
                    )}
                  />
                  <Chip label={getBattleTypeLabel(battle)} />
                </View>
                {battle.voting_opens_at && (
                  <Text variant="caption" color="muted">
                    {t('battles.timeLeft')}:{' '}
                    {new Date(battle.voting_closes_at ?? battle.voting_opens_at).toLocaleDateString()}
                  </Text>
                )}
              </DetailSection>
              <DetailSection title={t('battles.viewOnWeb')}>
                <Text variant="bodyM" color="muted">
                  {t('battles.webNote')}
                </Text>
                <MobileButton label={t('battles.viewOnWeb')} onPress={openOnWeb} />
              </DetailSection>
            </>
          )}
        </ScrollView>
      </SafeAreaContainer>
    </>
  )
}
