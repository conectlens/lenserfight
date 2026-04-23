import { queryKeys } from '@lenserfight/data/cache'
import { agentsService } from '@lenserfight/data/repositories'
import type { AgentAutomationFeedItem } from '@lenserfight/types'
import { useQuery } from '@tanstack/react-query'

export function useAgentAutomationFeed(aiLenserId: string | undefined, limit = 100) {
  return useQuery<AgentAutomationFeedItem[]>({
    queryKey: queryKeys.agents.automationFeed(aiLenserId ?? ''),
    queryFn: () => agentsService.getAutomationFeed(aiLenserId!, limit),
    enabled: !!aiLenserId,
    staleTime: 1000 * 30,
  })
}
