import { queryKeys } from '@lenserfight/data/cache'
import {
  SupabasePolicyEvaluationsRepository,
  type ListPolicyLogOptions,
} from '@lenserfight/data/repositories'
import { useQuery } from '@tanstack/react-query'

const repo = new SupabasePolicyEvaluationsRepository()

export function usePolicyLog(aiLenserId: string, options?: ListPolicyLogOptions) {
  return useQuery({
    queryKey: queryKeys.agents.policyLog(aiLenserId, options),
    queryFn: () => repo.listPolicyLog(aiLenserId, options),
    enabled: !!aiLenserId,
    staleTime: 60_000,
  })
}
