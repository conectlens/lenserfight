import { workflowsService } from '@lenserfight/data/repositories'
import { useQuery } from '@tanstack/react-query'

export function useWorkflow(workflowId: string | undefined) {
  const bootstrap = useQuery({
    queryKey: ['workflow-bootstrap', workflowId ?? ''],
    queryFn: () => workflowsService.getBootstrap(workflowId!),
    enabled: !!workflowId,
    staleTime: 1000 * 30,
  })

  return {
    workflow: bootstrap.data?.workflow ?? null,
    nodes: bootstrap.data?.nodes ?? [],
    edges: bootstrap.data?.edges ?? [],
    isLoading: bootstrap.isLoading,
    error: bootstrap.error,
  }
}
