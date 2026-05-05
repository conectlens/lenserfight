import { queryKeys } from '@lenserfight/data/cache'
import { lenserboardRepository } from '@lenserfight/data/repositories'
import type { TrendingBattleRecord } from '@lenserfight/data/repositories'
import { useInfiniteQuery } from '@tanstack/react-query'

const PAGE_SIZE = 20

export const useTrendingBattles = () => {
  return useInfiniteQuery<TrendingBattleRecord[], Error>({
    queryKey: queryKeys.battles.trending(),
    queryFn: ({ pageParam }) =>
      lenserboardRepository.getTrendingBattles(PAGE_SIZE, (pageParam as number | null) ?? null),
    initialPageParam: null,
    getNextPageParam: (lastPage) => {
      if (lastPage.length < PAGE_SIZE) return undefined
      const last = lastPage[lastPage.length - 1]
      return last?.vote_velocity ?? undefined
    },
    staleTime: 1000 * 60,
  })
}
