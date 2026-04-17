import { paginatedResponse, type ApiResponseEnvelope } from '@lenserfight/api/contracts'
import { supabase } from '@lenserfight/data/supabase'
import type { AuthorProfile } from '@lenserfight/types'

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
  /** Aggregated `kind-*` tag slugs across the workflow's nodes. */
  kinds: string[]
}

export interface WorkflowNodeRecord {
  id: string
  workflow_id: string
  lens_id: string
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
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'skipped'
  context_inputs: Record<string, unknown>
  global_model_id?: string | null
  started_at?: string | null
  completed_at?: string | null
  created_at: string
  budget_credits?: number | null
  spent_credits?: number
  cost_metadata?: Record<string, unknown>
  /** Client-derived hash used to prevent double-trigger on UI retries. Added in migration 20260417140000. */
  idempotency_key?: string | null
}

export interface WorkflowNodeResultRecord {
  id: string
  run_id: string
  node_id: string
  execution_run_id?: string | null
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'skipped'
  output_data?: Record<string, unknown> | null
  error_message?: string | null
  started_at?: string | null
  completed_at?: string | null
  input_tokens?: number
  output_tokens?: number
  cost_credits?: number
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
  lens_id: string
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

// ─────────────────────────────────────────────────────────────────────────────
// Port
// ─────────────────────────────────────────────────────────────────────────────

export interface WorkflowsRepositoryPort {
  listByLenser(lenserId: string): Promise<WorkflowRecord[]>
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
  updateNodeResult(runId: string, nodeId: string, status: string, outputData?: Record<string, unknown>, errorMessage?: string): Promise<void>
  updateRunStatus(runId: string, status: string): Promise<void>
  appendRunEvent(runId: string, type: string, payload?: Record<string, unknown>): Promise<WorkflowRunEventRecord | null>
  listRunEvents(runId: string, afterEventId?: number, limit?: number): Promise<WorkflowRunEventRecord[]>
  getVersions(workflowId: string): Promise<WorkflowVersionRecord[]>
  createVersion(workflowId: string, changelog?: string): Promise<string>
  publishVersion(versionId: string): Promise<void>
  restoreVersion(versionId: string): Promise<void>
}

// ─────────────────────────────────────────────────────────────────────────────
// Supabase Implementation
// ─────────────────────────────────────────────────────────────────────────────

export class SupabaseWorkflowsRepository implements WorkflowsRepositoryPort {
  private handleError(error: unknown): never {
    throw error
  }

  private async timedRpc<T>(rpcName: string, operation: () => Promise<T>): Promise<T> {
    const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now()
    try {
      return await operation()
    } finally {
      const endedAt = typeof performance !== 'undefined' ? performance.now() : Date.now()
      if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
        // Lightweight local instrumentation for before/after perf verification.
        console.debug(`[workflowsRepository] ${rpcName} ${Math.round(endedAt - startedAt)}ms`)
      }
    }
  }

  // ── Reads via public.vw_workflows (no schema switch needed) ────────────────

  async listByLenser(lenserId: string): Promise<WorkflowRecord[]> {
    const { data, error } = await supabase
      .from('vw_workflows')
      .select('id, lenser_id, title, description, visibility, battle_count, node_count, created_at, updated_at')
      .eq('lenser_id', lenserId)
      .order('updated_at', { ascending: false })

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
    errorMessage?: string
  ): Promise<void> {
    const { error } = await supabase.rpc('fn_update_workflow_node_result', {
      p_run_id: runId,
      p_node_id: nodeId,
      p_status: status,
      p_output_data: outputData ?? null,
      p_error_message: errorMessage ?? null,
    })

    if (error) this.handleError(error)
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
}
