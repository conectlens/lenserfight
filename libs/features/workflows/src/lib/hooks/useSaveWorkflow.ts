import { queryKeys } from '@lenserfight/data/cache'
import { workflowsService } from '@lenserfight/data/repositories'
import type { UpsertNodeInput, UpsertEdgeInput, WorkflowNodeRecord, WorkflowEdgeRecord } from '@lenserfight/data/repositories'
import { useMutation, useQueryClient } from '@tanstack/react-query'

interface SaveWorkflowInput {
  workflowId: string
  nodes: UpsertNodeInput[]
  edges: UpsertEdgeInput[]
  nodeDelta?: UpsertNodeInput[]
  edgeDelta?: UpsertEdgeInput[]
  mergeMode?: 'replace' | 'merge'
  persistNodes?: boolean
  persistEdges?: boolean
}

export function useSaveWorkflow() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      workflowId,
      nodes,
      edges,
      nodeDelta,
      edgeDelta,
      mergeMode = 'replace',
      persistNodes = true,
      persistEdges = true,
    }: SaveWorkflowInput) => {
      const nodesPayload = nodeDelta ?? nodes
      const edgesPayload = edgeDelta ?? edges

      // Nodes must be persisted before edges — edges have FK constraints on node IDs
      const savedNodes = persistNodes
        ? nodesPayload.length > 0
          ? await workflowsService.upsertNodes(workflowId, nodesPayload)
          : []
        : ((queryClient.getQueryData(queryKeys.workflows.nodes(workflowId)) as WorkflowNodeRecord[] | undefined) ?? [])
      const savedEdges = persistEdges
        ? edgesPayload.length > 0
          ? await workflowsService.upsertEdges(workflowId, edgesPayload)
          : []
        : ((queryClient.getQueryData(queryKeys.workflows.edges(workflowId)) as WorkflowEdgeRecord[] | undefined) ?? [])
      return { nodes: savedNodes, edges: savedEdges, mergeMode }
    },
    onSuccess: ({ nodes: savedNodes, edges: savedEdges, mergeMode }, variables) => {
      // Update cache directly — avoids a redundant fn_get_workflow_nodes/edges refetch
      if (mergeMode === 'merge') {
        queryClient.setQueryData(queryKeys.workflows.nodes(variables.workflowId), (old: WorkflowNodeRecord[] | undefined) => {
          const current = old ?? []
          if (savedNodes.length === 0) return current
          const byId = new Map(current.map((n) => [n.id, n]))
          for (const row of savedNodes) byId.set(row.id, row)
          return Array.from(byId.values())
        })
        queryClient.setQueryData(queryKeys.workflows.edges(variables.workflowId), (old: WorkflowEdgeRecord[] | undefined) => {
          const current = old ?? []
          if (savedEdges.length === 0) return current
          const byId = new Map(current.map((e) => [e.id, e]))
          for (const row of savedEdges) byId.set(row.id, row)
          return Array.from(byId.values())
        })
        return
      }

      queryClient.setQueryData(queryKeys.workflows.nodes(variables.workflowId), savedNodes)
      queryClient.setQueryData(queryKeys.workflows.edges(variables.workflowId), savedEdges)
    },
  })
}
