import { paginatedResponse, type ApiResponseEnvelope } from '@lenserfight/api/contracts'
import { supabase } from '@lenserfight/data/supabase'
import type {
  AuthorProfile,
  UpsertWorkflowScheduleInput,
  WorkflowRunStatus,
  WorkflowRunStateProjection,
  WorkflowRunProvenanceEdge,
  WorkflowScheduleRecord,
  WorkflowScheduleRunHistoryRecord,
  WorkflowTriggerMode,
  WorkflowPhaseRecord,
  WorkflowTaskRecord,
} from '@lenserfight/types'

import { debugRepositoryEvent } from './debugLogger'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface WorkflowRecord {
  id: string
  lenser_id: string
  title: string
  description?: string | null
  visibility: string
  battle_count: number
  node_count?: number
  reaction_totals?: Record<string, number> | null
  fork_count?: number
  parent_workflow_id?: string | null
  author_profile?: AuthorProfile | null
  parent_workflow_title?: string | null
  parent_workflow_author_profile?: AuthorProfile | null
  created_at: string
  updated_at: string
  /**
   * Aggregated output modalities across all nodes in this workflow.
   * Populated by the DB view when `kinds` are tagged on nodes.
   * Values: 'text' | 'image' | 'video' | 'audio' | 'music'
   */
  output_modalities?: string[] | null
  /**
   * Viewer's own reactions on this workflow keyed by reaction enum
   * (e.g. `{ like: true, saved: true }`). Populated by
   * `fn_get_workflow_bootstrap` so the page can skip a follow-up
   * `fn_get_entity_reaction_status` round trip. Empty `{}` when
   * unauthenticated or no reactions.
   */
  viewer_reactions?: Record<string, boolean> | null
}

/**
 * Row returned by `public.fn_list_template_workflows` (migration
 * 20260417150000_lens_chain_templates.sql). Templates are workflows tagged with
 * the canonical `template` content.tags row and surface in the
 * "Start from template" strip on WorkflowsPage.
 */
export interface TemplateWorkflowRecord {
  id: string
  lenser_id: string
  title: string
  description?: string | null
  visibility: string
  node_count: number
  reaction_totals?: Record<string, number> | null
  fork_count: number
  created_at: string
  updated_at: string
  author_handle?: string | null
  author_display_name?: string | null
  /** Aggregated lens-kind tag slugs across the workflow's nodes (e.g. `text`, `image`). */
  kinds: string[]
}

export interface WorkflowNodeRecord {
  id: string
  workflow_id: string
  lens_id: string | null
  version_id?: string | null
  position_x: number
  position_y: number
  label?: string | null
  ordinal: number
  created_at: string
  // Enriched by fn_get_workflow_nodes JOIN (added in migration)
  config?: Record<string, unknown> | null
  lens_visibility?: string | null
  lens_lenser_id?: string | null
}

export interface WorkflowEdgeRecord {
  id: string
  workflow_id: string
  source_node_id: string
  target_node_id: string
  source_output_key: string
  target_param_label: string
  /** Added in migration 20260417140000_lens_output_contract.sql. Nullable. */
  merge_strategy?: 'last_write_wins' | 'concat' | 'array' | 'json_object' | null
  /** Added in migration 20260417140000_lens_output_contract.sql. Nullable JSONB. */
  condition?: Record<string, unknown> | null
}

export interface WorkflowBootstrapRecord {
  workflow: WorkflowRecord | null
  nodes: WorkflowNodeRecord[]
  edges: WorkflowEdgeRecord[]
}

export interface WorkflowRunRecord {
  id: string
  workflow_id: string
  triggered_by?: string | null
  status: WorkflowRunStatus
  context_inputs: Record<string, unknown>
  global_model_id?: string | null
  schedule_id?: string | null
  trigger_mode?: WorkflowTriggerMode
  started_at?: string | null
  completed_at?: string | null
  created_at: string
  budget_credits?: number | null
  spent_credits?: number
  cost_metadata?: Record<string, unknown>
  /** Client-derived hash used to prevent double-trigger on UI retries. Added in migration 20260417140000. */
  idempotency_key?: string | null
  /** The AI lenser that executed this run. NULL for human-workspace runs. Populated by scheduled
   *  dispatch and by fn_start_workflow_run when the caller is acting as an AI workspace. */
  ai_lenser_id?: string | null
  /** Set when this run was created by lf run replay — links back to the source run. */
  parent_run_id?: string | null
  /** Nesting depth of subflow chains (0 = root, max 8). */
  recursion_depth?: number
}

export interface WorkflowNodeResultRecord {
  id: string
  run_id: string
  node_id: string
  execution_run_id?: string | null
  status:
    | 'pending'
    | 'awaiting_dependency'
    | 'queued'
    | 'running'
    | 'streaming'
    | 'retrying'
    | 'completed'
    | 'failed'
    | 'cancelled'
    | 'skipped'
    | 'timed_out'
    | 'blocked'
    | 'invalidated'
  output_data?: Record<string, unknown> | null
  error_message?: string | null
  started_at?: string | null
  completed_at?: string | null
  input_tokens?: number
  output_tokens?: number
  cost_credits?: number
  /** Phase 6 observability — retries consumed by NodeRuntime (>= 0). */
  retry_count?: number
  /** Phase 6 observability — wall-clock of the final provider attempt (ms). */
  duration_ms?: number | null
  /** Phase 6 observability — time-to-first-byte on streamed nodes (ms). */
  ttfb_ms?: number | null
  /**
   * N8N-style — populated when status is `awaiting_dependency`, `queued`, or
   * `retrying`. Cleared on every transition out of a waiting status.
   * Conventional values: dependency, condition_false, rate_limit,
   * retry_backoff, human_input, external_callback, queued.
   */
  waiting_reason?: string | null
}

export interface WorkflowRunEventRecord {
  event_id: number
  type: string
  run_id: string
  timestamp: string
  payload: Record<string, unknown>
}

export interface WorkflowsListFilter {
  visibility?: 'public' | 'private' | 'unlisted'
  sort?: 'updated_at' | 'created_at' | 'battle_count'
  search?: string
}

export interface CreateWorkflowInput {
  title: string
  description?: string
  visibility?: 'public' | 'private' | 'unlisted'
}

export interface UpdateWorkflowInput {
  title: string
  description?: string | null
  visibility: 'public' | 'private' | 'unlisted'
}

export interface UpsertNodeInput {
  id?: string
  lens_id: string | null
  version_id?: string | null
  position_x: number
  position_y: number
  label?: string
  ordinal?: number
  config?: Record<string, unknown> | null
}

export interface UpsertEdgeInput {
  id?: string
  source_node_id: string
  target_node_id: string
  source_output_key?: string
  target_param_label: string
  merge_strategy?: 'last_write_wins' | 'concat' | 'array' | 'json_object' | null
  condition?: Record<string, unknown> | null
}

export interface WorkflowVersionRecord {
  id: string
  workflow_id: string
  version_number: number
  changelog?: string | null
  status: 'draft' | 'published' | 'archived'
  published_at?: string | null
  created_by?: string | null
  created_at: string
  node_count: number
  edge_count: number
}

/**
 * Optional metadata passed to `updateNodeResult`. All fields map directly to
 * the matching `p_*` arguments on `public.fn_update_workflow_node_result`.
 */
export interface UpdateNodeResultOptions {
  /** Number of provider retries consumed so far. */
  retryCount?: number | null
  /** Wall-clock duration (ms) of the final provider attempt. */
  durationMs?: number | null
  /** Time-to-first-byte (ms) for streaming providers. */
  ttfbMs?: number | null
  /**
   * Why the node is currently waiting. Only persisted when status is one of
   * `awaiting_dependency`, `queued`, or `retrying`.
   */
  waitingReason?: string | null
}

/**
 * Input to `recordRunProvenance` (1:1 with `fn_record_run_provenance`).
 */
export interface RecordRunProvenanceInput {
  sourceRunId: string
  sourceNodeId: string
  sourceOutputPath: string
  targetRunId: string
  targetNodeId: string
  targetInputPath: string
  /** Optional mapping/transform metadata captured at edge-binding time. */
  transform?: Record<string, unknown> | null
}

// ─────────────────────────────────────────────────────────────────────────────
// Port
// ─────────────────────────────────────────────────────────────────────────────

export interface WorkflowsRepositoryPort {
  listByLenser(lenserId: string, limit?: number): Promise<WorkflowRecord[]>
  listByLenserPaginated(lenserId: string, offset: number, limit: number, filter?: WorkflowsListFilter): Promise<ApiResponseEnvelope<WorkflowRecord[]>>
  getPopular(offset: number, limit: number, search?: string): Promise<ApiResponseEnvelope<WorkflowRecord[]>>
  listTemplates(limit?: number, offset?: number): Promise<TemplateWorkflowRecord[]>
  getById(id: string): Promise<WorkflowRecord | null>
  getBootstrap(workflowId: string): Promise<WorkflowBootstrapRecord | null>
  getNodes(workflowId: string): Promise<WorkflowNodeRecord[]>
  getEdges(workflowId: string): Promise<WorkflowEdgeRecord[]>
  createWorkflow(input: CreateWorkflowInput): Promise<WorkflowRecord>
  updateWorkflow(id: string, input: UpdateWorkflowInput): Promise<WorkflowRecord>
  forkWorkflow(sourceId: string): Promise<WorkflowRecord>
  upsertNodes(workflowId: string, nodes: UpsertNodeInput[]): Promise<WorkflowNodeRecord[]>
  upsertEdges(workflowId: string, edges: UpsertEdgeInput[]): Promise<WorkflowEdgeRecord[]>
  deleteNode(nodeId: string): Promise<void>
  deleteEdge(edgeId: string): Promise<void>
  startRun(workflowId: string, inputs?: Record<string, unknown>, globalModelId?: string, idempotencyKey?: string): Promise<WorkflowRunRecord>
  getRun(runId: string): Promise<WorkflowRunRecord | null>
  getNodeResults(runId: string): Promise<WorkflowNodeResultRecord[]>
  updateNodeResult(
    runId: string,
    nodeId: string,
    status: string,
    outputData?: Record<string, unknown>,
    errorMessage?: string,
    options?: UpdateNodeResultOptions,
  ): Promise<void>
  updateRunStatus(runId: string, status: string): Promise<void>
  appendRunEvent(runId: string, type: string, payload?: Record<string, unknown>): Promise<WorkflowRunEventRecord | null>
  listRunEvents(runId: string, afterEventId?: number, limit?: number): Promise<WorkflowRunEventRecord[]>
  /**
   * N8N-style canonical run projection. Returns the active node, waiting/
   * executed counts, ordered node results, and provenance edge counts in
   * one round trip. Drives the workflow execution inspector.
   */
  getRunState(runId: string): Promise<WorkflowRunStateProjection | null>
  /**
   * Field-level cross-workflow provenance edges for a single run. Returns
   * both `upstream` (data into this run) and `downstream` (data leaving this
   * run) edges so the inspector can render both lineage tabs at once.
   */
  getRunProvenance(runId: string): Promise<WorkflowRunProvenanceEdge[]>
  /**
   * Records a single field-level data handoff. Idempotent on the
   * (source, target, path) tuple.
   */
  recordRunProvenance(input: RecordRunProvenanceInput): Promise<string>
  getSchedules(workflowId?: string): Promise<WorkflowScheduleRecord[]>
  upsertSchedule(input: UpsertWorkflowScheduleInput): Promise<WorkflowScheduleRecord | null>
  deleteSchedule(scheduleId: string): Promise<void>
  getScheduleHistory(scheduleId: string): Promise<WorkflowScheduleRunHistoryRecord[]>
  getVersions(workflowId: string): Promise<WorkflowVersionRecord[]>
  createVersion(workflowId: string, changelog?: string): Promise<string>
  publishVersion(versionId: string): Promise<void>
  restoreVersion(versionId: string): Promise<void>
  listRuns(workflowId: string, limit?: number, offset?: number): Promise<WorkflowRunRecord[]>
  listPhases(workflowId: string): Promise<WorkflowPhaseRecord[]>
  upsertPhase(phase: Partial<WorkflowPhaseRecord> & { workflow_id: string }): Promise<WorkflowPhaseRecord>
  deletePhase(phaseId: string): Promise<void>
  reorderPhases(workflowId: string, orderedIds: string[]): Promise<void>
  listTasks(phaseId: string): Promise<WorkflowTaskRecord[]>
  listTasksByWorkflow(workflowId: string): Promise<WorkflowTaskRecord[]>
  upsertTask(task: Partial<WorkflowTaskRecord> & { phase_id: string; workflow_id: string }): Promise<WorkflowTaskRecord>
  deleteTask(taskId: string): Promise<void>
  reorderTasks(phaseId: string, orderedIds: string[]): Promise<void>
}

// ─────────────────────────────────────────────────────────────────────────────
// Supabase Implementation
// ─────────────────────────────────────────────────────────────────────────────

export class SupabaseWorkflowsRepository implements WorkflowsRepositoryPort {
  private handleError(error: unknown): never {
    throw error
  }

  private async timedRpc<T>(rpcName: string, operation: () => PromiseLike<T>): Promise<T> {
    const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now()
    debugRepositoryEvent('workflowsRepository', 'rpc start', { rpcName })
    try {
      return await operation()
    } finally {
      const endedAt = typeof performance !== 'undefined' ? performance.now() : Date.now()
      debugRepositoryEvent('workflowsRepository', 'rpc end', {
        rpcName,
        durationMs: Math.round(endedAt - startedAt),
      })
    }
  }

  private mapScheduleRow(row: WorkflowScheduleRecord): WorkflowScheduleRecord {
    return {
      ...row,
      timezone: row.timezone ?? 'UTC',
      inputs_template: (row.inputs_template ?? {}) as Record<string, unknown>,
      global_model_id: row.global_model_id ?? null,
      assignee_type: row.assignee_type ?? 'agent',
      assignee_id: row.assignee_id ?? null,
      workflow_assignment_id: row.workflow_assignment_id ?? null,
      approval_policy: (row.approval_policy ?? {}) as Record<string, unknown>,
      retry_policy: (row.retry_policy ?? {}) as Record<string, unknown>,
      failure_policy: (row.failure_policy ?? {}) as Record<string, unknown>,
      queue_policy: (row.queue_policy ?? {}) as Record<string, unknown>,
      next_run_at: row.next_run_at ?? null,
      last_run_at: row.last_run_at ?? null,
      last_run_id: row.last_run_id ?? null,
      last_dispatch_status: row.last_dispatch_status ?? null,
      last_error_at: row.last_error_at ?? null,
      last_error_message: row.last_error_message ?? null,
      last_completed_at: row.last_completed_at ?? null,
      last_result: (row.last_result ?? {}) as Record<string, unknown>,
    }
  }

  // ── Reads via public.vw_workflows (no schema switch needed) ────────────────

  async listByLenser(lenserId: string, limit = 100): Promise<WorkflowRecord[]> {
    const { data, error } = await supabase
      .from('vw_workflows')
      .select('id, lenser_id, title, description, visibility, battle_count, node_count, created_at, updated_at')
      .eq('lenser_id', lenserId)
      .order('updated_at', { ascending: false })
      .limit(limit)

    if (error) this.handleError(error)
    return (data ?? []) as WorkflowRecord[]
  }

  async listByLenserPaginated(
    lenserId: string,
    offset: number,
    limit: number,
    filter: WorkflowsListFilter = {}
  ): Promise<ApiResponseEnvelope<WorkflowRecord[]>> {
    const { data, error } = await this.timedRpc('fn_get_my_workflows', () => supabase.rpc('fn_get_my_workflows', {
      p_lenser_id: lenserId,
      p_offset: offset,
      p_limit: limit,
      p_visibility: filter.visibility ?? null,
      p_sort: filter.sort ?? 'updated_at',
      p_search: filter.search ?? null,
    })
    )

    if (error) this.handleError(error)

    const rows = (data ?? []) as WorkflowRecord[]
    return paginatedResponse(rows, {
      offset,
      limit,
      hasNextPage: rows.length === limit,
    })
  }

  async getPopular(
    offset: number,
    limit: number,
    search?: string
  ): Promise<ApiResponseEnvelope<WorkflowRecord[]>> {
    const { data, error } = await this.timedRpc('fn_workflows_get_popular', () => supabase.rpc('fn_workflows_get_popular', {
      p_offset: offset,
      p_limit: limit,
      p_search: search ?? null,
    })
    )

    if (error) this.handleError(error)

    const rows = (data ?? []) as WorkflowRecord[]
    return paginatedResponse(rows, {
      offset,
      limit,
      hasNextPage: rows.length === limit,
    })
  }

  async listTemplates(limit = 12, offset = 0): Promise<TemplateWorkflowRecord[]> {
    const { data, error } = await this.timedRpc('fn_list_template_workflows', () =>
      supabase.rpc('fn_list_template_workflows', { p_limit: limit, p_offset: offset })
    )
    if (error) this.handleError(error)
    return (data ?? []) as TemplateWorkflowRecord[]
  }

  async getById(id: string): Promise<WorkflowRecord | null> {
    const { data, error } = await supabase.rpc('fn_get_workflow_detail', {
      p_workflow_id: id,
    })

    if (error) this.handleError(error)
    const row = Array.isArray(data) ? data[0] : data
    return (row ?? null) as WorkflowRecord | null
  }

  async getBootstrap(workflowId: string): Promise<WorkflowBootstrapRecord | null> {
    const { data, error } = await this.timedRpc('fn_get_workflow_bootstrap', () => supabase.rpc('fn_get_workflow_bootstrap', {
      p_workflow_id: workflowId,
    })
    )

    if (error) this.handleError(error)

    const row = Array.isArray(data) ? data[0] : data
    if (!row) return null

    return {
      workflow: (row.workflow ?? null) as WorkflowRecord | null,
      nodes: Array.isArray(row.nodes) ? (row.nodes as WorkflowNodeRecord[]) : [],
      edges: Array.isArray(row.edges) ? (row.edges as WorkflowEdgeRecord[]) : [],
    }
  }

  // ── Reads via public-schema RPCs (lenses schema not exposed to PostgREST) ──

  async getNodes(workflowId: string): Promise<WorkflowNodeRecord[]> {
    const { data, error } = await supabase.rpc('fn_get_workflow_nodes', {
      p_workflow_id: workflowId,
    })

    if (error) this.handleError(error)
    return (data ?? []) as WorkflowNodeRecord[]
  }

  async getEdges(workflowId: string): Promise<WorkflowEdgeRecord[]> {
    const { data, error } = await supabase.rpc('fn_get_workflow_edges', {
      p_workflow_id: workflowId,
    })

    if (error) this.handleError(error)
    return (data ?? []) as WorkflowEdgeRecord[]
  }

  // ── Writes via SECURITY DEFINER RPCs in public schema ──────────────────────

  async createWorkflow(input: CreateWorkflowInput): Promise<WorkflowRecord> {
    const { data, error } = await supabase.rpc('fn_create_workflow', {
      p_title: input.title,
      p_description: input.description ?? null,
      p_visibility: input.visibility ?? 'public',
    })

    if (error) this.handleError(error)
    // rpc returns an array for RETURNS TABLE; take the first row
    const row = Array.isArray(data) ? data[0] : data
    return row as WorkflowRecord
  }

  async updateWorkflow(id: string, input: UpdateWorkflowInput): Promise<WorkflowRecord> {
    const { data, error } = await supabase.rpc('fn_update_workflow', {
      p_workflow_id: id,
      p_title: input.title,
      p_description: input.description ?? null,
      p_visibility: input.visibility,
    })

    if (error) this.handleError(error)
    const row = Array.isArray(data) ? data[0] : data
    return row as WorkflowRecord
  }

  async forkWorkflow(sourceId: string): Promise<WorkflowRecord> {
    const { data, error } = await supabase.rpc('fn_clone_workflow', {
      p_source_workflow_id: sourceId,
    })

    if (error) this.handleError(error)
    const row = Array.isArray(data) ? data[0] : data
    return row as WorkflowRecord
  }

  async upsertNodes(workflowId: string, nodes: UpsertNodeInput[]): Promise<WorkflowNodeRecord[]> {
    const { data, error } = await this.timedRpc('fn_upsert_workflow_nodes', () => supabase.rpc('fn_upsert_workflow_nodes', {
      p_workflow_id: workflowId,
      p_nodes: nodes,
    })
    )

    if (error) this.handleError(error)
    return (data ?? []) as WorkflowNodeRecord[]
  }

  async upsertEdges(workflowId: string, edges: UpsertEdgeInput[]): Promise<WorkflowEdgeRecord[]> {
    const { data, error } = await supabase.rpc('fn_upsert_workflow_edges', {
      p_workflow_id: workflowId,
      p_edges: edges,
    })

    if (error) this.handleError(error)
    return (data ?? []) as WorkflowEdgeRecord[]
  }

  async deleteNode(nodeId: string): Promise<void> {
    const { error } = await supabase.rpc('fn_delete_workflow_node', {
      p_node_id: nodeId,
    })

    if (error) this.handleError(error)
  }

  async deleteEdge(edgeId: string): Promise<void> {
    const { error } = await supabase.rpc('fn_delete_workflow_edge', {
      p_edge_id: edgeId,
    })

    if (error) this.handleError(error)
  }

  async startRun(
    workflowId: string,
    inputs: Record<string, unknown> = {},
    globalModelId?: string,
    idempotencyKey?: string,
  ): Promise<WorkflowRunRecord> {
    const payload: Record<string, unknown> = {
      p_workflow_id: workflowId,
      p_inputs: inputs,
      p_global_model_id: globalModelId ?? null,
    }
    if (idempotencyKey) payload['p_idempotency_key'] = idempotencyKey

    const { data, error } = await supabase.rpc('fn_start_workflow_run', payload)

    if (error) this.handleError(error)

    const runId = data as string
    const run = await this.getRun(runId)
    if (!run) throw new Error('Workflow run not found after creation')
    return run
  }

  async getRun(runId: string): Promise<WorkflowRunRecord | null> {
    const { data, error } = await supabase.rpc('fn_get_workflow_run', {
      p_run_id: runId,
    })

    if (error) this.handleError(error)
    const row = Array.isArray(data) ? data[0] : data
    return (row ?? null) as WorkflowRunRecord | null
  }

  async getNodeResults(runId: string): Promise<WorkflowNodeResultRecord[]> {
    const { data, error } = await supabase.rpc('fn_get_workflow_node_results', {
      p_run_id: runId,
    })

    if (error) this.handleError(error)
    return (data ?? []) as WorkflowNodeResultRecord[]
  }

  async updateNodeResult(
    runId: string,
    nodeId: string,
    status: string,
    outputData?: Record<string, unknown>,
    errorMessage?: string,
    options?: UpdateNodeResultOptions,
  ): Promise<void> {
    const payload: Record<string, unknown> = {
      p_run_id: runId,
      p_node_id: nodeId,
      p_status: status,
      p_output_data: outputData ?? null,
      p_error_message: errorMessage ?? null,
    }
    if (options?.retryCount !== undefined) payload['p_retry_count'] = options.retryCount
    if (options?.durationMs !== undefined) payload['p_duration_ms'] = options.durationMs
    if (options?.ttfbMs !== undefined) payload['p_ttfb_ms'] = options.ttfbMs
    if (options?.waitingReason !== undefined) payload['p_waiting_reason'] = options.waitingReason

    const { error } = await supabase.rpc('fn_update_workflow_node_result', payload)

    if (error) this.handleError(error)
  }

  async getRunState(runId: string): Promise<WorkflowRunStateProjection | null> {
    const { data, error } = await this.timedRpc('fn_get_workflow_run_state', () =>
      supabase.rpc('fn_get_workflow_run_state', { p_run_id: runId }),
    )

    if (error) this.handleError(error)
    const row = Array.isArray(data) ? data[0] : data
    return (row ?? null) as WorkflowRunStateProjection | null
  }

  async getRunProvenance(runId: string): Promise<WorkflowRunProvenanceEdge[]> {
    const { data, error } = await this.timedRpc('fn_get_run_provenance', () =>
      supabase.rpc('fn_get_run_provenance', { p_run_id: runId }),
    )

    if (error) this.handleError(error)
    return (data ?? []) as WorkflowRunProvenanceEdge[]
  }

  async recordRunProvenance(input: RecordRunProvenanceInput): Promise<string> {
    const { data, error } = await supabase.rpc('fn_record_run_provenance', {
      p_source_run_id: input.sourceRunId,
      p_source_node_id: input.sourceNodeId,
      p_source_output_path: input.sourceOutputPath,
      p_target_run_id: input.targetRunId,
      p_target_node_id: input.targetNodeId,
      p_target_input_path: input.targetInputPath,
      p_transform: input.transform ?? null,
    })

    if (error) this.handleError(error)
    return data as string
  }

  async updateRunStatus(runId: string, status: string): Promise<void> {
    const { error } = await supabase.rpc('fn_update_workflow_run_status', {
      p_run_id: runId,
      p_status: status,
    })

    if (error) this.handleError(error)
  }

  async appendRunEvent(
    runId: string,
    type: string,
    payload: Record<string, unknown> = {},
  ): Promise<WorkflowRunEventRecord | null> {
    const { data, error } = await supabase.rpc('fn_append_workflow_run_event', {
      p_run_id: runId,
      p_type: type,
      p_payload: payload,
    })

    if (error) this.handleError(error)
    const row = Array.isArray(data) ? data[0] : data
    if (!row) return null

    return {
      event_id: Number((row as Record<string, unknown>)['event_id']),
      type,
      run_id: runId,
      timestamp: String((row as Record<string, unknown>)['created_at']),
      payload,
    }
  }

  async listRunEvents(
    runId: string,
    afterEventId = 0,
    limit = 200,
  ): Promise<WorkflowRunEventRecord[]> {
    const { data, error } = await supabase.rpc('fn_list_workflow_run_events', {
      p_run_id: runId,
      p_after_event_id: afterEventId,
      p_limit: limit,
    })

    if (error) this.handleError(error)
    return ((data ?? []) as WorkflowRunEventRecord[]).map((row) => ({
      event_id: Number(row.event_id),
      type: row.type,
      run_id: row.run_id,
      timestamp: String((row as unknown as Record<string, unknown>)['occurred_at'] ?? row.timestamp ?? ''),
      payload: (row.payload ?? {}) as Record<string, unknown>,
    }))
  }

  async getSchedules(workflowId?: string): Promise<WorkflowScheduleRecord[]> {
    const { data, error } = await supabase.rpc(
      'fn_get_workflow_schedules',
      workflowId ? { p_workflow_id: workflowId } : {}
    )

    if (error) this.handleError(error)
    return ((data ?? []) as WorkflowScheduleRecord[]).map((row) => this.mapScheduleRow(row))
  }

  async upsertSchedule(input: UpsertWorkflowScheduleInput): Promise<WorkflowScheduleRecord | null> {
    const { data, error } = await supabase.rpc('fn_upsert_workflow_schedule', {
      p_workflow_id: input.workflow_id,
      p_schedule_id: input.schedule_id ?? null,
      p_cron_expr: input.cron_expr,
      p_timezone: input.timezone ?? 'UTC',
      p_global_model_id: input.global_model_id ?? null,
      p_inputs_template: input.inputs_template ?? {},
      p_is_active: input.is_active ?? true,
      p_description: input.description ?? null,
      p_assignee_id: input.assignee_id ?? null,
      p_workflow_assignment_id: input.workflow_assignment_id ?? null,
      p_approval_policy: input.approval_policy ?? { requiresApproval: true },
      p_retry_policy: input.retry_policy ?? { maxRetries: 1 },
      p_failure_policy: input.failure_policy ?? { mode: 'isolate' },
      p_queue_policy: input.queue_policy ?? { mode: 'parallel' },
    })

    if (error) this.handleError(error)
    const row = Array.isArray(data) ? data[0] : data
    return row ? this.mapScheduleRow(row as WorkflowScheduleRecord) : null
  }

  async deleteSchedule(scheduleId: string): Promise<void> {
    const { error } = await supabase.rpc('fn_delete_workflow_schedule', {
      p_schedule_id: scheduleId,
    })

    if (error) this.handleError(error)
  }

  async getScheduleHistory(scheduleId: string): Promise<WorkflowScheduleRunHistoryRecord[]> {
    const { data, error } = await supabase.rpc('fn_get_workflow_schedule_history', {
      p_schedule_id: scheduleId,
    })

    if (error) this.handleError(error)
    return (data ?? []) as WorkflowScheduleRunHistoryRecord[]
  }

  // ── Workflow Versioning ────────────────────────────────────────────────────

  async getVersions(workflowId: string): Promise<WorkflowVersionRecord[]> {
    const { data, error } = await supabase.rpc('fn_get_workflow_versions', {
      p_workflow_id: workflowId,
    })

    if (error) this.handleError(error)
    return (data ?? []) as WorkflowVersionRecord[]
  }

  async createVersion(workflowId: string, changelog?: string): Promise<string> {
    const { data, error } = await supabase.rpc('fn_create_workflow_version', {
      p_workflow_id: workflowId,
      p_changelog: changelog ?? null,
    })

    if (error) this.handleError(error)
    return data as string
  }

  async publishVersion(versionId: string): Promise<void> {
    const { error } = await supabase.rpc('fn_publish_workflow_version', {
      p_version_id: versionId,
    })

    if (error) this.handleError(error)
  }

  async restoreVersion(versionId: string): Promise<void> {
    const { error } = await supabase.rpc('fn_restore_workflow_version', {
      p_version_id: versionId,
    })

    if (error) this.handleError(error)
  }

  async listRuns(workflowId: string, limit = 20, offset = 0): Promise<WorkflowRunRecord[]> {
    const { data, error } = await supabase.rpc('fn_list_workflow_runs', {
      p_workflow_id: workflowId,
      p_limit: limit,
      p_offset: offset,
    })

    if (error) this.handleError(error)
    return (data ?? []) as WorkflowRunRecord[]
  }

  // ── Phases ──────────────────────────────────────────────────────────────────

  async listPhases(workflowId: string): Promise<WorkflowPhaseRecord[]> {
    const { data, error } = await supabase.rpc('fn_list_workflow_phases', {
      p_workflow_id: workflowId,
    })
    if (error) this.handleError(error)
    return (data ?? []) as WorkflowPhaseRecord[]
  }

  async upsertPhase(phase: Partial<WorkflowPhaseRecord> & { workflow_id: string }): Promise<WorkflowPhaseRecord> {
    const { data, error } = await supabase.rpc('fn_upsert_workflow_phase', {
      p_workflow_id: phase.workflow_id,
      p_title: phase.title ?? '',
      p_description: phase.description ?? null,
      p_ordinal: phase.ordinal ?? 0,
      p_id: phase.id ?? null,
    })
    if (error) this.handleError(error)
    return data as WorkflowPhaseRecord
  }

  async deletePhase(phaseId: string): Promise<void> {
    const { error } = await supabase.rpc('fn_delete_workflow_phase', {
      p_phase_id: phaseId,
    })
    if (error) this.handleError(error)
  }

  async reorderPhases(workflowId: string, orderedIds: string[]): Promise<void> {
    const { error } = await supabase.rpc('fn_reorder_workflow_phases', {
      p_workflow_id: workflowId,
      p_ordered_ids: orderedIds,
    })
    if (error) this.handleError(error)
  }

  // ── Tasks ───────────────────────────────────────────────────────────────────

  async listTasks(phaseId: string): Promise<WorkflowTaskRecord[]> {
    const { data, error } = await supabase.rpc('fn_list_workflow_tasks', {
      p_phase_id: phaseId,
    })
    if (error) this.handleError(error)
    return (data ?? []) as WorkflowTaskRecord[]
  }

  async listTasksByWorkflow(workflowId: string): Promise<WorkflowTaskRecord[]> {
    const { data, error } = await supabase.rpc('fn_list_workflow_tasks_by_workflow', {
      p_workflow_id: workflowId,
    })
    if (error) this.handleError(error)
    return (data ?? []) as WorkflowTaskRecord[]
  }

  async upsertTask(task: Partial<WorkflowTaskRecord> & { phase_id: string; workflow_id: string }): Promise<WorkflowTaskRecord> {
    const { data, error } = await supabase.rpc('fn_upsert_workflow_task', {
      p_phase_id: task.phase_id,
      p_workflow_id: task.workflow_id,
      p_title: task.title ?? '',
      p_prompt_text: task.prompt_text ?? null,
      p_output_type: task.output_type ?? 'text',
      p_model_hint: task.model_hint ?? null,
      p_ordinal: task.ordinal ?? 0,
      p_id: task.id ?? null,
    })
    if (error) this.handleError(error)
    return data as WorkflowTaskRecord
  }

  async deleteTask(taskId: string): Promise<void> {
    const { error } = await supabase.rpc('fn_delete_workflow_task', {
      p_task_id: taskId,
    })
    if (error) this.handleError(error)
  }

  async reorderTasks(phaseId: string, orderedIds: string[]): Promise<void> {
    const { error } = await supabase.rpc('fn_reorder_workflow_tasks', {
      p_phase_id: phaseId,
      p_ordered_ids: orderedIds,
    })
    if (error) this.handleError(error)
  }
}
