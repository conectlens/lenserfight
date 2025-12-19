import { useInfiniteQuery } from '@tanstack/react-query'

import { xpService } from '../services/xpService'
import { LeaderboardTimeframe, LeaderboardScope } from '../types/xp.types'

export const useLeaderboard = (timeframe: LeaderboardTimeframe, scope: LeaderboardScope) => {
  const pageSize = 20
  return useInfiniteQuery({
    queryKey: ['xp', 'leaderboard', timeframe, scope],
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
