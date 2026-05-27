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
import { ScrollView, View } from 'react-native'

import { useLensDetail } from '../../hooks/useMobileContent'
import { screenStyles } from '../../styles/screenStyles'

export default function LensDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { t } = useTranslation()
  const router = useRouter()
  const lenser = useLenserOptional()
  const query = useLensDetail(id, lenser?.lenser?.id)
  const lens = query.data

  return (
    <>
      <Stack.Screen options={{ title: t('lenses.detail') }} />
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
    </>
  )
}
