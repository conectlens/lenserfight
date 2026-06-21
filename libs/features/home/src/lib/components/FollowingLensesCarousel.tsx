import { LensCard } from '@lenserfight/features/lenses'
import { EmptyState } from '@lenserfight/ui/components'
import { Sparkles } from 'lucide-react'
import React, { useCallback, useRef } from 'react'

import { useFollowingPrompts } from '../useThreads'

interface FollowingLensesCarouselProps {
  lenserId: string
}

export const FollowingLensesCarousel: React.FC<FollowingLensesCarouselProps> = ({ lenserId }) => {
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useFollowingPrompts(lenserId, true)

  const lenses = data?.pages.flatMap((page) => page.data ?? []) ?? []

  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  const sentinelCallbackRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) observerRef.current.disconnect()
      if (!node) return

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
            fetchNextPage()
          }
        },
        { threshold: 0.1 }
      )
      observerRef.current.observe(node)
      sentinelRef.current = node
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage]
  )

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex-shrink-0 w-64 h-52 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 animate-pulse"
          />
        ))}
      </div>
    )
  }

  if (lenses.length === 0) {
    return (
      <EmptyState
        icon={Sparkles}
        title="No lenses by your followings yet"
        description="Follow lensers to see their public lenses here."
        className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm"
      />
    )
  }

  return (
    <div
      className="flex gap-4 overflow-x-auto pb-3 scroll-smooth"
      style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
    >
      {lenses.map((lens) => (
        <div
          key={lens.id}
          className="flex-shrink-0 w-64"
          style={{ scrollSnapAlign: 'start' }}
        >
          <LensCard lens={lens} />
        </div>
      ))}

      {/* Infinite scroll sentinel */}
      <div ref={sentinelCallbackRef} className="flex-shrink-0 w-4 self-stretch" />

      {isFetchingNextPage && (
        <div className="flex-shrink-0 flex items-center justify-center w-16">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
        </div>
      )}
    </div>
  )
}
