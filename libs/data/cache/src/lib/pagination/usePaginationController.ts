import { useState, useCallback } from 'react'

import type { ApiMeta } from 'contracts'

import type { IPaginationStrategy, PaginationMode } from './paginationStrategy'

/**
 * GRASP Controller + Pure Fabrication.
 *
 * Drives either the infinite-scroll or numbered-pagination strategy from a
 * single `ApiMeta` value.  Consumers obtain the strategy object and call
 * `onOffsetChange` when they need to load a new page.
 *
 * @param meta        The `meta` field from the latest `ApiResponseEnvelope`.
 * @param mode        'infinite' for infinite-scroll feeds; 'numbered' for
 *                    admin/arena/mobile paginated views.
 * @param onOffsetChange  Called with the new offset whenever the user
 *                        navigates (next, previous, goToPage, reset).
 */
export function usePaginationController(
  meta: ApiMeta | undefined,
  mode: PaginationMode,
  onOffsetChange: (offset: number) => void,
): IPaginationStrategy {
  const limit = meta?.limit ?? 20
  const total = meta?.total
  const serverHasNextPage = meta?.hasNextPage

  // Information Expert — controller owns offset state and derives everything else
  const [currentOffset, setCurrentOffset] = useState(0)

  const hasNextPage =
    serverHasNextPage !== undefined
      ? serverHasNextPage
      : total !== undefined
        ? currentOffset + limit < total
        : false

  const hasPreviousPage = currentOffset > 0

  const currentPage = Math.floor(currentOffset / limit) + 1

  const totalPages = total !== undefined ? Math.ceil(total / limit) : undefined

  const go = useCallback(
    (offset: number) => {
      const clamped = Math.max(0, offset)
      setCurrentOffset(clamped)
      onOffsetChange(clamped)
    },
    [onOffsetChange],
  )

  const goToNextPage = useCallback(() => {
    if (hasNextPage) go(currentOffset + limit)
  }, [hasNextPage, currentOffset, limit, go])

  const goToPreviousPage = useCallback(() => {
    if (hasPreviousPage) go(Math.max(0, currentOffset - limit))
  }, [hasPreviousPage, currentOffset, limit, go])

  const goToPage = useCallback(
    (page: number) => {
      const offset = (page - 1) * limit
      go(offset)
    },
    [limit, go],
  )

  const reset = useCallback(() => go(0), [go])

  return {
    mode,
    currentOffset,
    limit,
    total,
    hasNextPage,
    hasPreviousPage,
    currentPage,
    totalPages,
    goToNextPage,
    goToPreviousPage,
    goToPage,
    reset,
  }
}
