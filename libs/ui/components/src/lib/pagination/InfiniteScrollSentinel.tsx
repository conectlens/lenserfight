import { useEffect, useRef } from 'react'

interface InfiniteScrollSentinelProps {
  hasNextPage: boolean
  isFetchingNextPage: boolean
  fetchNextPage: () => void
  /** IntersectionObserver rootMargin. Default: '200px' */
  threshold?: string
  loader?: React.ReactNode
}

/**
 * Passive IntersectionObserver sentinel for apps/forum infinite feeds.
 *
 * Drop this at the bottom of any list. When it enters the viewport and
 * `hasNextPage` is true, `fetchNextPage` is called automatically.
 * Uses no scroll event listeners — works on mobile and low-power devices.
 */
export function InfiniteScrollSentinel({
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  threshold = '200px',
  loader,
}: InfiniteScrollSentinelProps) {
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { rootMargin: threshold },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, threshold])

  return (
    <div ref={sentinelRef} aria-hidden="true" style={{ height: 1 }}>
      {isFetchingNextPage && (loader ?? <DefaultLoader />)}
    </div>
  )
}

function DefaultLoader() {
  return (
    <div className="flex justify-center py-4" role="status" aria-label="Loading more">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent opacity-60" />
    </div>
  )
}
