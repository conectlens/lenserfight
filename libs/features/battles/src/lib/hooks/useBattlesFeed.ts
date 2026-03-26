import { queryKeys } from '@lenserfight/data/cache'
import { battlesService } from '@lenserfight/data/repositories'
import { useInfiniteQuery } from '@tanstack/react-query'

import type { Battle } from '../types/battle.types'

const PAGE_SIZE = 20

export type BattlesFeedSortBy = 'newest' | 'most_votes' | 'trending'

export const useBattlesFeed = (filter?: string, sortBy: BattlesFeedSortBy = 'newest') => {
  const orderByVotes = sortBy === 'most_votes' || sortBy === 'trending'

  return useInfiniteQuery<Battle[], Error>({
    queryKey: queryKeys.battles.feed(filter, sortBy),
    queryFn: ({ pageParam }) =>
      battlesService.getBattlesFeed(
        filter,
        PAGE_SIZE,
        pageParam as string | undefined,
        sortBy,
      ) as Promise<Battle[]>,
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => {
      if (lastPage.length < PAGE_SIZE) return undefined
      const last = lastPage[lastPage.length - 1]
      if (!last) return undefined
      return orderByVotes
        ? String(last.total_vote_count)
        : last.published_at ?? undefined
    },
    staleTime: 1000 * 30,
  })
}
