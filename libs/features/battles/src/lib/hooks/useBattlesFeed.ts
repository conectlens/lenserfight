import { queryKeys } from '@lenserfight/data/cache'
import { battlesService } from '@lenserfight/data/repositories'
import { useInfiniteQuery } from '@tanstack/react-query'

import type { Battle } from '../types/battle.types'

const PAGE_SIZE = 20

export const useBattlesFeed = (filter?: string) => {
  return useInfiniteQuery<Battle[], Error>({
    queryKey: queryKeys.battles.feed(filter),
    queryFn: ({ pageParam }) =>
      battlesService.getBattlesFeed(filter, PAGE_SIZE, pageParam as string | undefined) as Promise<Battle[]>,
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => {
      if (lastPage.length < PAGE_SIZE) return undefined
      return lastPage[lastPage.length - 1]?.published_at ?? undefined
    },
    staleTime: 1000 * 30,
  })
}
