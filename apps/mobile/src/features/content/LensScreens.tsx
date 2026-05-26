import { useLenserOptional } from '@lenserfight/features/profile/native'
import {
  DetailSection,
  EmptyContentState,
  ErrorState,
  LoadingState,
  SummaryCard,
} from '@lenserfight/ui/components/native'
import { SafeAreaContainer } from '@lenserfight/ui/layout/native'
import { Chip, Text } from '@lenserfight/ui/primitives/native'
import { useRouter } from 'expo-router'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, View } from 'react-native'

import { useLensDetail, useLensList } from '../../hooks/useMobileContent'
import { screenStyles } from '../../styles/screenStyles'

export const LensListScreen: React.FC = () => {
  const { t } = useTranslation()
  const router = useRouter()
  const query = useLensList()

  return (
    <SafeAreaContainer testID="lens-list-screen">
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
          <EmptyContentState title={t('states.empty')} description={t('lenses.empty')} />
        )}
        {query.data?.map((lens) => (
          <SummaryCard
            key={lens.id}
            title={lens.title}
            subtitle={lens.description}
            meta={`@${lens.author.handle} · ${lens.usageCount} ${t('lenses.uses')}`}
            tags={lens.tags}
            onPress={() => router.push(`/lens/${lens.id}`)}
            testID="lens-list-item"
          />
        ))}
      </ScrollView>
    </SafeAreaContainer>
  )
}

export const LensDetailScreen: React.FC<{ id: string }> = ({ id }) => {
  const { t } = useTranslation()
  const router = useRouter()
  const lenser = useLenserOptional()
  const query = useLensDetail(id, lenser?.lenser?.id)
  const lens = query.data

  return (
    <SafeAreaContainer testID="lens-detail-screen">
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
        {!query.isLoading && !query.isError && !lens && (
          <EmptyContentState title={t('states.empty')} description={t('states.notFound')} />
        )}
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
                  <Chip
                    key={tag.id}
                    label={tag.name}
                    onPress={() => router.push(`/tag/${tag.slug}`)}
                  />
                ))}
              </View>
            </DetailSection>
            <DetailSection title={t('lenses.detail')}>
              <Text variant="bodyM">{lens.content}</Text>
            </DetailSection>
          </>
        )}
      </ScrollView>
    </SafeAreaContainer>
  )
}

