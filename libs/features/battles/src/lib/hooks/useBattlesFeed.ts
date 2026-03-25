import { queryKeys } from '@lenserfight/data/cache'
import { battlesService } from '@lenserfight/data/repositories'
import { useQuery } from '@tanstack/react-query'

import type { Battle } from '../types/battle.types'

export const useBattlesFeed = (filter?: string) => {
  return useQuery<Battle[], Error>({
    queryKey: queryKeys.battles.feed(filter),
    queryFn: () => battlesService.getBattlesFeed(filter),
    staleTime: 1000 * 30,
  })
}
