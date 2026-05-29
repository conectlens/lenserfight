import {
  EmptyContentState,
  ErrorState,
  LoadingState,
  SummaryCard,
} from '@lenserfight/ui/components/native'
import { SafeAreaContainer } from '@lenserfight/ui/layout/native'
import { useRouter } from 'expo-router'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView } from 'react-native'

import { useBattleList } from '../../hooks/useMobileContent'
import { getBattleTypeLabel } from '../../utils/battleTypeLabel'
import { screenStyles } from '../../styles/screenStyles'

const STATUS_LABELS: Record<string, string> = {
  pending: 'pending',
  active: 'active',
  voting: 'voting',
  judging: 'judging',
  completed: 'completed',
}

export default function BattlesTab() {
  const { t } = useTranslation()
  const router = useRouter()
  const query = useBattleList()

  return (
    <SafeAreaContainer testID="battle-list-screen">
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
        {!query.isLoading && !query.isError && query.data?.length === 0 && (
          <EmptyContentState title={t('states.empty')} description={t('battles.empty')} />
        )}
        {query.data?.map((battle) => (
          <SummaryCard
            key={battle.id}
            title={battle.title}
            subtitle={t(
              `battles.status.${STATUS_LABELS[battle.status] ?? battle.status}`,
              battle.status
            )}
            meta={getBattleTypeLabel(battle)}
            tags={[]}
            onPress={() => router.push(`/battle/${battle.id}`)}
            testID="battle-list-item"
          />
        ))}
      </ScrollView>
    </SafeAreaContainer>
  )
}
