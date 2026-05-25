import React from 'react'
import { View } from 'react-native'
import { Chip, Text } from '@lenserfight/ui/primitives/native'
import { useLenserOptional } from '@lenserfight/features/profile/native'
import { useTranslation } from 'react-i18next'
import { useThreadDetail, useThreadList } from '../../hooks/useMobileContent'
import type { MobileNavigator } from '../../navigation/types'
import { ScreenScaffold } from '../../ui/ScreenScaffold'
import { EmptyContentState, ErrorState, LoadingState } from '../../ui/StateViews'
import { DetailSection, SummaryCard } from './ContentCards'

export const ThreadListScreen: React.FC<{ navigator: MobileNavigator }> = ({ navigator }) => {
  const { t } = useTranslation()
  const query = useThreadList()

  return (
    <ScreenScaffold title={t('threads.title')} subtitle={t('threads.subtitle')} testID="thread-list-screen">
      {query.isLoading && <LoadingState />}
      {query.isError && <ErrorState message={query.error.message} onRetry={() => query.refetch()} />}
      {!query.isLoading && !query.isError && query.data?.length === 0 && (
        <EmptyContentState description={t('threads.empty')} />
      )}
      {query.data?.map((thread) => (
        <SummaryCard
          key={thread.id}
          title={thread.title}
          subtitle={thread.content}
          meta={`@${thread.author.handle} · ${thread.replyCount} ${t('threads.replies')} · ${thread.reactionCount} ${t('threads.reactions')}`}
          tags={thread.tags}
          onPress={() => navigator.goThread(thread.id, thread.title)}
          testID="thread-list-item"
        />
      ))}
    </ScreenScaffold>
  )
}

export const ThreadDetailScreen: React.FC<{ navigator: MobileNavigator; id: string }> = ({
  navigator,
  id,
}) => {
  const { t } = useTranslation()
  const lenser = useLenserOptional()
  const query = useThreadDetail(id, lenser?.lenser?.id)
  const thread = query.data

  return (
    <ScreenScaffold title={thread?.title ?? t('threads.detail')} onBack={navigator.goBack} testID="thread-detail-screen">
      {query.isLoading && <LoadingState />}
      {query.isError && <ErrorState message={query.error.message} onRetry={() => query.refetch()} />}
      {!query.isLoading && !query.isError && !thread && <EmptyContentState description={t('states.notFound')} />}
      {thread && (
        <>
          <DetailSection title={thread.title}>
            <Text variant="bodyM">{thread.content}</Text>
            <Text variant="caption" color="muted">
              @{thread.author.handle} · {thread.reactionCount} {t('threads.reactions')}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {thread.tags.map((tag) => (
                <Chip key={tag.id} label={tag.name} onPress={() => navigator.goTag(tag.slug, tag.name)} />
              ))}
            </View>
          </DetailSection>
          <DetailSection title={t('threads.replies')}>
            {thread.replies.length === 0 ? (
              <Text variant="bodyM" color="muted">
                {t('states.empty')}
              </Text>
            ) : (
              thread.replies.slice(0, 10).map((reply) => (
                <Text key={reply.id} variant="bodyM">
                  {reply.content}
                </Text>
              ))
            )}
          </DetailSection>
        </>
      )}
    </ScreenScaffold>
  )
}
