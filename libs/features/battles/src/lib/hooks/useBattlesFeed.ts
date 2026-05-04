import { queryKeys } from '@lenserfight/data/cache'
import { battlesService } from '@lenserfight/data/repositories'
import type { BattleFeedItemRecord } from '@lenserfight/data/repositories'
import { useInfiniteQuery } from '@tanstack/react-query'

import type { BattleType } from '../types/battle.types'

const PAGE_SIZE = 20

export type BattlesFeedSortBy = 'newest' | 'most_votes' | 'trending'

export const useBattlesFeed = (
  status?: string,
  sortBy: BattlesFeedSortBy = 'newest',
  battleType?: BattleType | 'all'
) => {
  return useInfiniteQuery<BattleFeedItemRecord[], Error>({
    queryKey: queryKeys.battles.feed(status, sortBy, battleType),
    queryFn: ({ pageParam }) =>
      battlesService.getBattlesFeedItems({
        status: status && status !== 'all' ? status : undefined,
        battleType: battleType && battleType !== 'all' ? battleType as BattleType : undefined,
        limit: PAGE_SIZE,
        cursor: pageParam as string | undefined,
      }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => {
      if (lastPage.length < PAGE_SIZE) return undefined
      const last = lastPage[lastPage.length - 1]
      return last?.published_at ?? undefined
    },
    staleTime: 1000 * 30,
  })
}
