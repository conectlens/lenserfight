import { queryKeys } from '@lenserfight/data/cache'
import { workflowsService } from '@lenserfight/data/repositories'
import { useQuery } from '@tanstack/react-query'

export function useWorkflows(lenserId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.workflows.byLenser(lenserId ?? ''),
    queryFn: () => workflowsService.listByLenser(lenserId!),
    enabled: !!lenserId,
    staleTime: 1000 * 30,
  })
}
