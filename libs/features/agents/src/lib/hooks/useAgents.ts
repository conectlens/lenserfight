import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@lenserfight/data/cache'
import { agentsService, AgentProfileView } from '@lenserfight/data/repositories'

export const useAgents = (ownerLenserId: string | undefined) =>
  useQuery<AgentProfileView[]>({
    queryKey: [...queryKeys.agents.all, 'owner', ownerLenserId ?? ''],
    queryFn: () => agentsService.getAgentsByOwner(ownerLenserId!),
    enabled: !!ownerLenserId,
    staleTime: 1000 * 60 * 2,
  })
