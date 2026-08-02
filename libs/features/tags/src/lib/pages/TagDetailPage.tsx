import React, { useCallback, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import { CreateLensModal, useCreateLens } from '@lenserfight/features/lenses'
import { CreateThreadModal } from '@lenserfight/features/threads'
import { HelpButton, SEOHead } from '@lenserfight/ui/components'
import { useUI } from '@lenserfight/ui/providers'
import { TagContentGrid } from '../components/TagContentGrid'
import { TagCreateActions } from '../components/TagCreateActions'
import { TagFilterBar } from '../components/TagFilterBar'
import { TagHeader } from '../components/TagHeader'
import { useTagDetailController } from '../hooks/useTagDetailController'

export const TagDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { setPageTitle } = useUI()

  const { tag, items, loading, hasNextPage, fetchNextPage, filter, setFilter, sort, setSort, availableFilters } =
    useTagDetailController(slug)

  const [isThreadOpen, setThreadOpen] = React.useState(false)
  const {
    isOpen: isLensOpen,
    openModal: openLensModal,
    closeModal: closeLensModal,
    form: lensForm,
    isSubmitting: isLensSubmitting,
    error: lensError,
    submit: submitLens,
  } = useCreateLens()

  // Both entry points (empty state and ray title) drive the same modals, so
  // the two placements can never fall out of sync.
  const createActions = (placement: 'header' | 'empty') => (
    <TagCreateActions
      placement={placement}
      onCreateThread={() => setThreadOpen(true)}
      onCreateLens={() => openLensModal()}
    />
  )

  const handleCreated = useCallback(() => {
    setThreadOpen(false)
    // The controller owns fetching; re-running it surfaces the new item.
    fetchNextPage()
  }, [fetchNextPage])

  useEffect(() => {
    if (tag) {
      setPageTitle(tag.name)
    } else {
      setPageTitle(null)
    }
    return () => setPageTitle(null)
  }, [tag, setPageTitle])

  if (!loading && !tag) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Topic Not Found</h2>
        <button
          onClick={() => navigate('/len')}
          className="text-primary-700 dark:text-primary-400 font-medium hover:underline"
        >
          Return to Explore
        </button>
      </div>
    )
  }

  return (
    <div className="w-full">
      <SEOHead type="tag" data={tag} />

      {/* Header Block */}
      {tag ? (
        <TagHeader
          tag={tag}
          totalItems={items.length}
          actions={!loading && items.length > 0 ? createActions('header') : undefined}
        />
      ) : (
        <div className="h-48 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse mb-8"></div>
      )}

      {/* Filters & Controls */}
      <TagFilterBar
        filters={availableFilters}
        activeFilter={filter}
        onFilterChange={setFilter}
        activeSort={sort}
        onSortChange={setSort}
      />

      <div className="flex justify-end my-2">
        <HelpButton path="/explanation/community/ray-cloud" label="About Ray Cloud" />
      </div>

      {/* Content Area */}
      <TagContentGrid
        items={items}
        loading={loading}
        emptyStateActions={createActions('empty')}
      />

      {/* Load More */}
      {!loading && items.length > 0 && (
        <div className="mt-12 flex justify-center">
          {hasNextPage ? (
            <button
              onClick={fetchNextPage}
              className="px-6 py-2 text-sm font-semibold rounded-full border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Load More
            </button>
          ) : (
            <p className="text-xs text-gray-400 dark:text-gray-600 uppercase tracking-widest font-semibold">
              End of Results
            </p>
          )}
        </div>
      )}

      <CreateThreadModal
        isOpen={isThreadOpen}
        onClose={() => setThreadOpen(false)}
        onSuccess={handleCreated}
      />

      <CreateLensModal
        isOpen={isLensOpen}
        onClose={closeLensModal}
        onSubmit={submitLens}
        form={lensForm}
        isSubmitting={isLensSubmitting}
        error={lensError}
      />
    </div>
  )
}
