import { queryKeys } from '@lenserfight/data/cache'
import { battlesService } from '@lenserfight/data/repositories'
import { useQuery } from '@tanstack/react-query'

import type { BattleStatus } from '@lenserfight/data/repositories'
import type { PublicExecutionJobRecord } from '@lenserfight/data/repositories'

export { PublicExecutionJobRecord }

export const useExecutionJobs = (battleId?: string, battleStatus?: BattleStatus) => {
  return useQuery<PublicExecutionJobRecord[], Error>({
    queryKey: queryKeys.battles.executionJobs(battleId ?? ''),
    queryFn: () => battlesService.getPublicExecutionJobs(battleId!),
    enabled: !!battleId,
    refetchInterval: battleStatus === 'executing' ? 3000 : false,
  })
}
