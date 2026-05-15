import { useEffect, useRef } from 'react'

interface InfiniteScrollSentinelProps {
  hasNextPage: boolean
  isFetchingNextPage: boolean
  fetchNextPage?: () => void
  /** Alias for `fetchNextPage`. */
  onLoadMore?: () => void
  /** IntersectionObserver rootMargin. Default: '200px' */
  threshold?: string
  loader?: React.ReactNode
}

/**
 * Passive IntersectionObserver sentinel for infinite feeds.
 *
 * Drop this at the bottom of any list. When it enters the viewport and
 * hasNextPage is true, fetchNextPage is called automatically.
 */
export function InfiniteScrollSentinel({
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  onLoadMore,
  threshold = '200px',
  loader,
}: InfiniteScrollSentinelProps) {
  const sentinelRef = useRef<HTMLDivElement>(null)
  const loadMore = fetchNextPage ?? onLoadMore

  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !loadMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          loadMore()
        }
      },
      { rootMargin: threshold },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, loadMore, threshold])

  return (
    <div ref={sentinelRef} aria-hidden="true" style={{ height: 1 }}>
      {isFetchingNextPage && (loader ?? <DefaultLoader />)}
    </div>
  )
}

function DefaultLoader() {
  return (
    <div className="flex justify-center py-4" role="status" aria-label="Loading more">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-greyscale-300 border-t-deep-lens-navy-500 dark:border-greyscale-700 dark:border-t-primary-yellow-500" />
    </div>
  )
}
