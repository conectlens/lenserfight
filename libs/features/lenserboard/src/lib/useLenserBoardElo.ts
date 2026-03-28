import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@lenserfight/data/cache'
import { reputationService } from '@lenserfight/data/repositories'

export const useLenserBoardElo = (limit = 50) =>
  useQuery({
    queryKey: [...queryKeys.reputation.all, 'elo-leaderboard', limit],
    queryFn: () => reputationService.getEloLeaderboard(limit, 0),
    staleTime: 1000 * 60 * 2,
  })
