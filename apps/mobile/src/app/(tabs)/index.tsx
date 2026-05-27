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

import { useThreadList } from '../../hooks/useMobileContent'
import { screenStyles } from '../../styles/screenStyles'

export default function ThreadsTab() {
  const { t } = useTranslation()
  const router = useRouter()
  const query = useThreadList()

  return (
    <SafeAreaContainer testID="thread-list-screen">
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
          <EmptyContentState title={t('states.empty')} description={t('threads.empty')} />
        )}
        {query.data?.map((thread) => (
          <SummaryCard
            key={thread.id}
            title={thread.title}
            subtitle={thread.content}
            meta={`@${thread.author.handle} · ${thread.replyCount} ${t('threads.replies')} · ${thread.reactionCount} ${t('threads.reactions')}`}
            tags={thread.tags}
            onPress={() => router.push(`/thread/${thread.id}`)}
            testID="thread-list-item"
          />
        ))}
      </ScrollView>
    </SafeAreaContainer>
  )
}
