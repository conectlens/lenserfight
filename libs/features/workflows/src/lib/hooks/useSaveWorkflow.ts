import { queryKeys } from '@lenserfight/data/cache'
import { workflowsService } from '@lenserfight/data/repositories'
import type { UpsertNodeInput, UpsertEdgeInput, WorkflowNodeRecord, WorkflowEdgeRecord } from '@lenserfight/data/repositories'
import { useMutation, useQueryClient } from '@tanstack/react-query'

interface SaveWorkflowInput {
  workflowId: string
  nodes: UpsertNodeInput[]
  edges: UpsertEdgeInput[]
  persistNodes?: boolean
  persistEdges?: boolean
}

export function useSaveWorkflow() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ workflowId, nodes, edges, persistNodes = true, persistEdges = true }: SaveWorkflowInput) => {
      // Nodes must be persisted before edges — edges have FK constraints on node IDs
      const savedNodes = persistNodes
        ? await workflowsService.upsertNodes(workflowId, nodes)
        : ((queryClient.getQueryData(queryKeys.workflows.nodes(workflowId)) as WorkflowNodeRecord[] | undefined) ?? [])
      const savedEdges = persistEdges
        ? await workflowsService.upsertEdges(workflowId, edges)
        : ((queryClient.getQueryData(queryKeys.workflows.edges(workflowId)) as WorkflowEdgeRecord[] | undefined) ?? [])
      return { nodes: savedNodes, edges: savedEdges }
    },
    onSuccess: ({ nodes: savedNodes, edges: savedEdges }, variables) => {
      // Update cache directly — avoids a redundant fn_get_workflow_nodes/edges refetch
      queryClient.setQueryData(queryKeys.workflows.nodes(variables.workflowId), savedNodes)
      queryClient.setQueryData(queryKeys.workflows.edges(variables.workflowId), savedEdges)
    },
  })
}
