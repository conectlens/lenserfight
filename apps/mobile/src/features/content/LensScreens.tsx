import React from 'react'
import { View } from 'react-native'
import { Chip, Text } from '@lenserfight/ui/primitives/native'
import { useLenserOptional } from '@lenserfight/features/profile/native'
import { useTranslation } from 'react-i18next'
import { useLensDetail, useLensList } from '../../hooks/useMobileContent'
import type { MobileNavigator } from '../../navigation/types'
import { ScreenScaffold } from '../../ui/ScreenScaffold'
import { EmptyContentState, ErrorState, LoadingState } from '../../ui/StateViews'
import { DetailSection, SummaryCard } from './ContentCards'

export const LensListScreen: React.FC<{ navigator: MobileNavigator }> = ({ navigator }) => {
  const { t } = useTranslation()
  const query = useLensList()

  return (
    <ScreenScaffold title={t('lenses.title')} subtitle={t('lenses.subtitle')} testID="lens-list-screen">
      {query.isLoading && <LoadingState />}
      {query.isError && <ErrorState message={query.error.message} onRetry={() => query.refetch()} />}
      {!query.isLoading && !query.isError && query.data?.length === 0 && (
        <EmptyContentState description={t('lenses.empty')} />
      )}
      {query.data?.map((lens) => (
        <SummaryCard
          key={lens.id}
          title={lens.title}
          subtitle={lens.description}
          meta={`@${lens.author.handle} · ${lens.usageCount} ${t('lenses.uses')}`}
          tags={lens.tags}
          onPress={() => navigator.goLens(lens.id, lens.title)}
          testID="lens-list-item"
        />
      ))}
    </ScreenScaffold>
  )
}

export const LensDetailScreen: React.FC<{ navigator: MobileNavigator; id: string }> = ({
  navigator,
  id,
}) => {
  const { t } = useTranslation()
  const lenser = useLenserOptional()
  const query = useLensDetail(id, lenser?.lenser?.id)
  const lens = query.data

  return (
    <ScreenScaffold title={lens?.title ?? t('lenses.detail')} onBack={navigator.goBack} testID="lens-detail-screen">
      {query.isLoading && <LoadingState />}
      {query.isError && <ErrorState message={query.error.message} onRetry={() => query.refetch()} />}
      {!query.isLoading && !query.isError && !lens && <EmptyContentState description={t('states.notFound')} />}
      {lens && (
        <>
          <DetailSection title={lens.title}>
            <Text variant="bodyM" color="muted">
              {lens.description}
            </Text>
            <Text variant="caption" color="muted">
              @{lens.author.handle}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {lens.tags.map((tag) => (
                <Chip key={tag.id} label={tag.name} onPress={() => navigator.goTag(tag.slug, tag.name)} />
              ))}
            </View>
          </DetailSection>
          <DetailSection title={t('lenses.detail')}>
            <Text variant="bodyM">{lens.content}</Text>
          </DetailSection>
        </>
      )}
    </ScreenScaffold>
  )
}
