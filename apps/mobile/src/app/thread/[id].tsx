import { useLenserOptional } from '@lenserfight/features/profile/native'
import {
  DetailSection,
  EmptyContentState,
  ErrorState,
  LoadingState,
} from '@lenserfight/ui/components/native'
import { SafeAreaContainer } from '@lenserfight/ui/layout/native'
import { Chip, Text } from '@lenserfight/ui/primitives/native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, View } from 'react-native'

import { useThreadDetail } from '../../hooks/useMobileContent'
import { screenStyles } from '../../styles/screenStyles'

export default function ThreadDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { t } = useTranslation()
  const router = useRouter()
  const lenser = useLenserOptional()
  const query = useThreadDetail(id, lenser?.lenser?.id)
  const thread = query.data

  return (
    <>
      <Stack.Screen options={{ title: t('threads.detail') }} />
      <SafeAreaContainer testID="thread-detail-screen">
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
          {!query.isLoading && !query.isError && !thread && (
            <EmptyContentState title={t('states.empty')} description={t('states.notFound')} />
          )}
          {thread && (
            <>
              <DetailSection title={thread.title}>
                <Text variant="bodyM">{thread.content}</Text>
                <Text variant="caption" color="muted">
                  @{thread.author.handle} · {thread.reactionCount} {t('threads.reactions')}
                </Text>
                <View style={styles.chips}>
                  {thread.tags.map((tag) => (
                    <Chip
                      key={tag.id}
                      label={tag.name}
                      onPress={() => router.push(`/tag/${tag.slug}`)}
                    />
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
        </ScrollView>
      </SafeAreaContainer>
    </>
  )
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
})
