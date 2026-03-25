import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@lenserfight/data/cache'
import { battlesService } from '@lenserfight/data/repositories'
import type { Contender, Submission } from '../types/battle.types'

export interface BattleContendersData {
  contenders: Contender[]
  submissions: Submission[]
}

export const useBattleContenders = (battleId?: string) => {
  return useQuery<BattleContendersData, Error>({
    queryKey: queryKeys.battles.contenders(battleId ?? ''),
    queryFn: async () => {
      const data = await battlesService.getContendersAndSubmissions(battleId!)
      return data as BattleContendersData
    },
    enabled: !!battleId,
    staleTime: 1000 * 60 * 2,
  })
}
