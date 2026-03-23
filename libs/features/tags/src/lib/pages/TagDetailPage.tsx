import React, { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import { SEOHead } from '@lenserfight/ui/components'
import { useUI } from '@lenserfight/ui/components'
import { TagContentGrid } from '../components/TagContentGrid'
import { TagFilterBar } from '../components/TagFilterBar'
import { TagHeader } from '../components/TagHeader'
import { useTagDetailController } from '../hooks/useTagDetailController'

export const TagDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { setPageTitle } = useUI()

  const { tag, items, loading, hasNextPage, fetchNextPage, filter, setFilter, sort, setSort, availableFilters } =
    useTagDetailController(slug)

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
        <TagHeader tag={tag} totalItems={items.length} />
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

      {/* Content Area */}
      <TagContentGrid items={items} loading={loading} />

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
    </div>
  )
}
