import React from 'react'
import { Linking, View } from 'react-native'
import { Chip, Text } from '@lenserfight/ui/primitives/native'
import { useTranslation } from 'react-i18next'
import { useBattleDetail, useBattleList } from '../../hooks/useMobileContent'
import type { MobileNavigator } from '../../navigation/types'
import { ScreenScaffold } from '../../ui/ScreenScaffold'
import { EmptyContentState, ErrorState, LoadingState } from '../../ui/StateViews'
import { MobileButton } from '../../ui/MobileButton'
import { DetailSection, SummaryCard } from './ContentCards'
import { ARENA_BASE_URL } from '@lenserfight/utils/env'

const STATUS_LABELS: Record<string, string> = {
  pending: 'pending',
  active: 'active',
  voting: 'voting',
  judging: 'judging',
  completed: 'completed',
}

export const BattleListScreen: React.FC<{ navigator: MobileNavigator }> = ({ navigator }) => {
  const { t } = useTranslation()
  const query = useBattleList()

  return (
    <ScreenScaffold title={t('battles.title')} subtitle={t('battles.subtitle')} testID="battle-list-screen">
      {query.isLoading && <LoadingState />}
      {query.isError && <ErrorState message={query.error.message} onRetry={() => query.refetch()} />}
      {!query.isLoading && !query.isError && query.data?.length === 0 && (
        <EmptyContentState description={t('battles.empty')} />
      )}
      {query.data?.map((battle) => (
        <SummaryCard
          key={battle.id}
          title={battle.title}
          subtitle={t(`battles.status.${STATUS_LABELS[battle.status] ?? battle.status}`, battle.status)}
          meta={battle.battleType}
          tags={[]}
          onPress={() => navigator.goBattle(battle.id, battle.title)}
          testID="battle-list-item"
        />
      ))}
    </ScreenScaffold>
  )
}

export const BattleDetailScreen: React.FC<{ navigator: MobileNavigator; id: string }> = ({
  navigator,
  id,
}) => {
  const { t } = useTranslation()
  const query = useBattleDetail(id)
  const battle = query.data

  const openOnWeb = () => {
    Linking.openURL(`${ARENA_BASE_URL}/battles/${id}`)
  }

  return (
    <ScreenScaffold title={battle?.title ?? t('battles.detail')} onBack={navigator.goBack} testID="battle-detail-screen">
      {query.isLoading && <LoadingState />}
      {query.isError && <ErrorState message={query.error.message} onRetry={() => query.refetch()} />}
      {!query.isLoading && !query.isError && !battle && (
        <EmptyContentState description={t('states.notFound')} />
      )}
      {battle && (
        <>
          <DetailSection title={battle.title}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Chip
                label={t(`battles.status.${STATUS_LABELS[battle.status] ?? battle.status}`, battle.status)}
              />
              <Chip label={battle.battleType} />
            </View>
            {battle.scheduledStart && (
              <Text variant="caption" color="muted">
                {t('battles.timeLeft')}: {new Date(battle.scheduledEnd ?? battle.scheduledStart).toLocaleDateString()}
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
    </ScreenScaffold>
  )
}
