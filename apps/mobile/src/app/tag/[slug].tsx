import {
  DetailSection,
  EmptyContentState,
  ErrorState,
  LoadingState,
  SummaryCard,
} from '@lenserfight/ui/components/native'
import { SafeAreaContainer } from '@lenserfight/ui/layout/native'
import { Text } from '@lenserfight/ui/primitives/native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView } from 'react-native'

import { useTagDetail } from '../../hooks/useMobileContent'
import { screenStyles } from '../../styles/screenStyles'

export default function TagDetailRoute() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const { t } = useTranslation()
  const router = useRouter()
  const query = useTagDetail(slug)
  const bundle = query.data

  return (
    <>
      <Stack.Screen options={{ title: t('tags.detail') }} />
      <SafeAreaContainer testID="tag-detail-screen">
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
          {!query.isLoading && !query.isError && !bundle?.tag && (
            <EmptyContentState title={t('states.empty')} description={t('states.notFound')} />
          )}
          {bundle?.tag && (
            <>
              <DetailSection title={bundle.tag.name}>
                <Text variant="bodyM" color="muted">
                  {bundle.tag.description || `${bundle.tag.count} items`}
                </Text>
              </DetailSection>
              <DetailSection title={t('tags.threads')}>
                {bundle.threads.length === 0 ? (
                  <Text variant="bodyM" color="muted">
                    {t('states.empty')}
                  </Text>
                ) : (
                  bundle.threads.map((thread) => (
                    <SummaryCard
                      key={thread.id}
                      title={thread.title}
                      subtitle={thread.content}
                      onPress={() => router.push(`/thread/${thread.id}`)}
                    />
                  ))
                )}
              </DetailSection>
              <DetailSection title={t('tags.lenses')}>
                {bundle.lenses.length === 0 ? (
                  <Text variant="bodyM" color="muted">
                    {t('states.empty')}
                  </Text>
                ) : (
                  bundle.lenses.map((lens) => (
                    <SummaryCard
                      key={lens.id}
                      title={lens.title}
                      subtitle={lens.description}
                      onPress={() => router.push(`/lens/${lens.id}`)}
                    />
                  ))
                )}
              </DetailSection>
            </>
          )}
        </ScrollView>
      </SafeAreaContainer>
    </>
  )
}
