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

import { useTagList } from '../../hooks/useMobileContent'
import { screenStyles } from '../../styles/screenStyles'

export default function TagsTab() {
  const { t } = useTranslation()
  const router = useRouter()
  const query = useTagList()

  return (
    <SafeAreaContainer testID="tag-list-screen">
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
          <EmptyContentState title={t('states.empty')} description={t('tags.empty')} />
        )}
        {query.data?.map((tag) => (
          <SummaryCard
            key={tag.id}
            title={tag.name}
            subtitle={tag.description}
            meta={`${tag.count} items · score ${Math.round(tag.trendingScore ?? 0)}`}
            onPress={() => router.push(`/tag/${tag.slug}`)}
            testID="tag-list-item"
          />
        ))}
      </ScrollView>
    </SafeAreaContainer>
  )
}
