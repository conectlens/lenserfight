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

import { useLensList } from '../../hooks/useMobileContent'
import { screenStyles } from '../../styles/screenStyles'

export default function LensesTab() {
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
