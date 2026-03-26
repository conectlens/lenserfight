import { queryKeys } from '@lenserfight/data/cache'
import { workflowsService } from '@lenserfight/data/repositories'
import { useQuery } from '@tanstack/react-query'

export function useWorkflow(workflowId: string | undefined) {
  const workflow = useQuery({
    queryKey: queryKeys.workflows.detail(workflowId ?? ''),
    queryFn: () => workflowsService.getById(workflowId!),
    enabled: !!workflowId,
    staleTime: 1000 * 30,
  })

  const nodes = useQuery({
    queryKey: queryKeys.workflows.nodes(workflowId ?? ''),
    queryFn: () => workflowsService.getNodes(workflowId!),
    enabled: !!workflowId,
    staleTime: 1000 * 30,
  })

  const edges = useQuery({
    queryKey: queryKeys.workflows.edges(workflowId ?? ''),
    queryFn: () => workflowsService.getEdges(workflowId!),
    enabled: !!workflowId,
    staleTime: 1000 * 30,
  })

  return {
    workflow: workflow.data ?? null,
    nodes: nodes.data ?? [],
    edges: edges.data ?? [],
    isLoading: workflow.isLoading || nodes.isLoading || edges.isLoading,
    error: workflow.error ?? nodes.error ?? edges.error,
  }
}
