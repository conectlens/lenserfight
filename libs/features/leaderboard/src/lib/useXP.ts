import { useInfiniteQuery } from '@tanstack/react-query'

import { queryKeys } from '@lenserfight/data/cache'
import { xpService } from '@lenserfight/data/repositories'
import { LeaderboardTimeframe, LeaderboardScope } from '@lenserfight/types'

export const useLeaderboard = (timeframe: LeaderboardTimeframe, scope: LeaderboardScope) => {
  const pageSize = 20
  return useInfiniteQuery({
    queryKey: queryKeys.xp.leaderboard(timeframe, scope),
    queryFn: ({ pageParam = 0 }) =>
      xpService.getLeaderboard(timeframe, scope, pageSize, pageParam * pageSize),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.list.length < pageSize) return undefined
      return allPages.length
    },
    refetchOnWindowFocus: true,
    staleTime: 1000 * 30, // 30 seconds
  })
}
