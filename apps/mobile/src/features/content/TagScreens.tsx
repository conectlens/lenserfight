import {
  DetailSection,
  EmptyContentState,
  ErrorState,
  LoadingState,
  SummaryCard,
} from '@lenserfight/ui/components/native'
import { SafeAreaContainer } from '@lenserfight/ui/layout/native'
import { Text } from '@lenserfight/ui/primitives/native'
import { useRouter } from 'expo-router'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView } from 'react-native'

import { useTagDetail, useTagList } from '../../hooks/useMobileContent'
import { screenStyles } from '../../styles/screenStyles'

export const TagListScreen: React.FC = () => {
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

export const TagDetailScreen: React.FC<{ slug: string }> = ({ slug }) => {
  const { t } = useTranslation()
  const router = useRouter()
  const query = useTagDetail(slug)
  const bundle = query.data

  return (
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
  )
}

