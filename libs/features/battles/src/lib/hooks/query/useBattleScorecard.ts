import { queryKeys } from '@lenserfight/data/cache'
import { battlesService } from '@lenserfight/data/repositories'
import { useQuery } from '@tanstack/react-query'

import type { Scorecard, RubricCriterion } from '../../types/battle.types'

export interface BattleScorecardData {
  scorecards: Scorecard[]
  criteria: RubricCriterion[]
}

export const useBattleScorecard = (battleId?: string) => {
  return useQuery<BattleScorecardData, Error>({
    queryKey: queryKeys.battles.scorecard(battleId ?? ''),
    queryFn: async () => {
      const data = await battlesService.getScorecardData(battleId!)
      return data as BattleScorecardData
    },
    enabled: !!battleId,
    staleTime: 1000 * 60 * 5,
  })
}
