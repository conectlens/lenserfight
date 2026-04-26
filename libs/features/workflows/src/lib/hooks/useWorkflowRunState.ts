import { workflowsService } from '@lenserfight/data/repositories'
import type {
  WorkflowRunProvenanceEdge,
  WorkflowRunStateProjection,
} from '@lenserfight/types'
import { useQuery } from '@tanstack/react-query'

const STALE_MS = 1000

/**
 * N8N-style canonical run-state projection. Returns a snapshot describing
 * which node is currently active, which are waiting, executed counts, and
 * provenance edge counts in a single round-trip
 * (`fn_get_workflow_run_state`).
 *
 * The query is polled while the run is still considered active (`isRunning`)
 * so the inspector reflects engine progress without waiting for SSE / Realtime
 * frames. Polling halts as soon as the projection reports a terminal status.
 */
export function useWorkflowRunState(runId: string | null | undefined) {
  return useQuery<WorkflowRunStateProjection | null>({
    queryKey: ['workflow', 'run-state', runId],
    enabled: Boolean(runId),
    queryFn: () => (runId ? workflowsService.getRunState(runId) : Promise.resolve(null)),
    staleTime: STALE_MS,
    refetchInterval: (query) => {
      const state = query.state.data
      if (!state) return STALE_MS
      // Stop polling once the projection reports a terminal run state.
      return state.is_running ? STALE_MS : false
    },
  })
}

/**
 * Field-level cross-workflow provenance edges for a run. Returns both the
 * upstream (data into this run) and downstream (data leaving this run) edges
 * in one fetch so the inspector renders both lineage tabs without flicker.
 */
export function useWorkflowRunProvenance(runId: string | null | undefined) {
  return useQuery<WorkflowRunProvenanceEdge[]>({
    queryKey: ['workflow', 'run-provenance', runId],
    enabled: Boolean(runId),
    queryFn: () => (runId ? workflowsService.getRunProvenance(runId) : Promise.resolve([])),
    staleTime: 5_000,
  })
}
