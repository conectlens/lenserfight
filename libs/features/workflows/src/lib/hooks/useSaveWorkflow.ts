import { queryKeys } from '@lenserfight/data/cache'
import { workflowsService } from '@lenserfight/data/repositories'
import type { UpsertNodeInput, UpsertEdgeInput } from '@lenserfight/data/repositories'
import { useMutation, useQueryClient } from '@tanstack/react-query'

interface SaveWorkflowInput {
  workflowId: string
  nodes: UpsertNodeInput[]
  edges: UpsertEdgeInput[]
}

export function useSaveWorkflow() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ workflowId, nodes, edges }: SaveWorkflowInput) => {
      const [savedNodes, savedEdges] = await Promise.all([
        workflowsService.upsertNodes(workflowId, nodes),
        workflowsService.upsertEdges(workflowId, edges),
      ])
      return { nodes: savedNodes, edges: savedEdges }
    },
    onSuccess: ({ nodes: savedNodes, edges: savedEdges }, variables) => {
      // Update cache directly — avoids a redundant fn_get_workflow_nodes/edges refetch
      queryClient.setQueryData(queryKeys.workflows.nodes(variables.workflowId), savedNodes)
      queryClient.setQueryData(queryKeys.workflows.edges(variables.workflowId), savedEdges)
    },
  })
}
