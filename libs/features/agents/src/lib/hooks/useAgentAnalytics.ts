import { useQuery } from '@tanstack/react-query'
import { SupabaseAgentAnalyticsRepository } from '@lenserfight/data/repositories'
import { queryKeys } from '@lenserfight/data/cache'

const repo = new SupabaseAgentAnalyticsRepository()

export interface UseAgentAnalyticsOptions {
  days?: number
  modelKey?: string
  workflowId?: string
}

export function useAgentAnalytics(
  aiLenserId: string | undefined,
  options: UseAgentAnalyticsOptions = {}
) {
  return useQuery({
    queryKey: queryKeys.agents.analyticsSummary(aiLenserId ?? '', options),
    queryFn: () => repo.getAgentAnalyticsSummary(aiLenserId!, options),
    enabled: !!aiLenserId,
    staleTime: 120_000,
  })
}
