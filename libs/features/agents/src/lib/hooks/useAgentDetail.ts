import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@lenserfight/data/cache'
import { agentsService, AgentProfileView } from '@lenserfight/data/repositories'

export const useAgentDetail = (agentId: string | undefined) =>
  useQuery<AgentProfileView | null>({
    queryKey: queryKeys.agents.detail(agentId ?? ''),
    queryFn: () => agentsService.getAgentProfile(agentId!),
    enabled: !!agentId,
    staleTime: 1000 * 60 * 2,
  })
