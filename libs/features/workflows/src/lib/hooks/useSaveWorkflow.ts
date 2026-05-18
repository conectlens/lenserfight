import { queryKeys } from '@lenserfight/data/cache'
import { workflowsService } from '@lenserfight/data/repositories'
import type { UpsertNodeInput, UpsertEdgeInput, WorkflowNodeRecord, WorkflowEdgeRecord } from '@lenserfight/data/repositories'
import { validateWorkflow, type ValidationIssue } from '@lenserfight/infra/execution'
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
  /**
   * Validation override. Defaults to `true` — pre-save structural validation
   * blocks writes that would create a cycle, orphan edges, or duplicate node
   * ids. Pass `false` for callers that intentionally persist partial graphs
   * (e.g. the initial-template seeding in CreateWorkflowWizard).
   */
  validateBeforeSave?: boolean
}

/**
 * Surfaces structural validation failures from `validateWorkflow` as a
 * throwable error carrying the issue list so the UI can highlight offending
 * nodes/edges.
 */
export class WorkflowValidationError extends Error {
  public readonly issues: ValidationIssue[]
  constructor(issues: ValidationIssue[]) {
    const msg =
      issues[0]?.message ??
      `Workflow failed structural validation (${issues.length} issue${issues.length === 1 ? '' : 's'})`
    super(msg)
    this.name = 'WorkflowValidationError'
    this.issues = issues
  }
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
      validateBeforeSave = true,
    }: SaveWorkflowInput) => {
      const nodesPayload = nodeDelta ?? nodes
      const edgesPayload = edgeDelta ?? edges

      // Pre-save structural validation (Phase 2). Guards against cycles,
      // orphan edges and duplicate node ids — every one of which would
      // render the workflow unexecutable. Contract- and routing-level
      // checks are opt-in and only run when paramLabels / kind are present
      // on the payload.
      if (validateBeforeSave && nodes.length > 0) {
        const result = validateWorkflow(
          nodes.map((n) => ({
            id: n.id ?? `__new__:${n.lens_id ?? 'utility'}:${n.ordinal ?? 0}`,
            lensId: n.lens_id ?? undefined,
            versionId: n.version_id ?? null,
            config: (n.config ?? null) as Record<string, unknown> | null,
          })),
          edges.map((e) => ({
            id: e.id,
            sourceNodeId: e.source_node_id,
            targetNodeId: e.target_node_id,
            sourceOutputKey: e.source_output_key,
            targetParamLabel: e.target_param_label,
            condition: e.condition as
              | { type: 'equals' | 'contains' | 'present' | 'truthy'; value?: unknown }
              | null
              | undefined,
          })),
        )
        if (!result.ok) {
          throw new WorkflowValidationError(result.errors)
        }
      }

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
