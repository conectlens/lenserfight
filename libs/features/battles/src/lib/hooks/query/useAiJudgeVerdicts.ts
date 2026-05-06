import { queryKeys } from '@lenserfight/data/cache'
import { battlesService } from '@lenserfight/data/repositories'
import { useQuery } from '@tanstack/react-query'

import type { AiJudgeVerdictRecord } from '@lenserfight/data/repositories'

export { AiJudgeVerdictRecord }

export const useAiJudgeVerdicts = (battleId?: string) => {
  return useQuery<AiJudgeVerdictRecord[], Error>({
    queryKey: queryKeys.battles.aiJudgeVerdicts(battleId ?? ''),
    queryFn: () => battlesService.getAiJudgeVerdicts(battleId!),
    enabled: !!battleId,
    staleTime: 1000 * 60, // verdicts are immutable once written
  })
}
