import React from 'react'
import { Text } from '@lenserfight/ui/primitives/native'
import { useTranslation } from 'react-i18next'
import { useTagDetail, useTagList } from '../../hooks/useMobileContent'
import type { MobileNavigator } from '../../navigation/types'
import { ScreenScaffold } from '../../ui/ScreenScaffold'
import { EmptyContentState, ErrorState, LoadingState } from '../../ui/StateViews'
import { DetailSection, SummaryCard } from './ContentCards'

export const TagListScreen: React.FC<{ navigator: MobileNavigator }> = ({ navigator }) => {
  const { t } = useTranslation()
  const query = useTagList()

  return (
    <ScreenScaffold title={t('tags.title')} subtitle={t('tags.subtitle')} testID="tag-list-screen">
      {query.isLoading && <LoadingState />}
      {query.isError && <ErrorState message={query.error.message} onRetry={() => query.refetch()} />}
      {!query.isLoading && !query.isError && query.data?.length === 0 && (
        <EmptyContentState description={t('tags.empty')} />
      )}
      {query.data?.map((tag) => (
        <SummaryCard
          key={tag.id}
          title={tag.name}
          subtitle={tag.description}
          meta={`${tag.count} items · score ${Math.round(tag.trendingScore ?? 0)}`}
          onPress={() => navigator.goTag(tag.slug, tag.name)}
          testID="tag-list-item"
        />
      ))}
    </ScreenScaffold>
  )
}

export const TagDetailScreen: React.FC<{ navigator: MobileNavigator; slug: string }> = ({
  navigator,
  slug,
}) => {
  const { t } = useTranslation()
  const query = useTagDetail(slug)
  const bundle = query.data

  return (
    <ScreenScaffold title={bundle?.tag?.name ?? t('tags.detail')} onBack={navigator.goBack} testID="tag-detail-screen">
      {query.isLoading && <LoadingState />}
      {query.isError && <ErrorState message={query.error.message} onRetry={() => query.refetch()} />}
      {!query.isLoading && !query.isError && !bundle?.tag && <EmptyContentState description={t('states.notFound')} />}
      {bundle?.tag && (
        <>
          <DetailSection title={bundle.tag.name}>
            <Text variant="bodyM" color="muted">
              {bundle.tag.description || `${bundle.tag.count} items`}
            </Text>
          </DetailSection>
          <DetailSection title={t('tags.threads')}>
            {bundle.threads.length === 0 ? (
              <Text variant="bodyM" color="muted">{t('states.empty')}</Text>
            ) : (
              bundle.threads.map((thread) => (
                <SummaryCard
                  key={thread.id}
                  title={thread.title}
                  subtitle={thread.content}
                  onPress={() => navigator.goThread(thread.id, thread.title)}
                />
              ))
            )}
          </DetailSection>
          <DetailSection title={t('tags.lenses')}>
            {bundle.lenses.length === 0 ? (
              <Text variant="bodyM" color="muted">{t('states.empty')}</Text>
            ) : (
              bundle.lenses.map((lens) => (
                <SummaryCard
                  key={lens.id}
                  title={lens.title}
                  subtitle={lens.description}
                  onPress={() => navigator.goLens(lens.id, lens.title)}
                />
              ))
            )}
          </DetailSection>
        </>
      )}
    </ScreenScaffold>
  )
}
