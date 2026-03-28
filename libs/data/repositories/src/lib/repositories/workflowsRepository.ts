import { paginatedResponse, type ApiResponseEnvelope } from '@lenserfight/api/contracts'
import { supabase } from '@lenserfight/data/supabase'

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
  reaction_totals?: Record<string, number> | null
  fork_count?: number
  parent_workflow_id?: string | null
  created_at: string
  updated_at: string
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
}

export interface WorkflowRunRecord {
  id: string
  workflow_id: string
  triggered_by?: string | null
  status: 'pending' | 'running' | 'completed' | 'failed'
  context_inputs: Record<string, unknown>
  global_model_id?: string | null
  started_at?: string | null
  completed_at?: string | null
  created_at: string
  budget_credits?: number | null
  spent_credits?: number
  cost_metadata?: Record<string, unknown>
}

export interface WorkflowNodeResultRecord {
  id: string
  run_id: string
  node_id: string
  execution_run_id?: string | null
  status: 'pending' | 'running' | 'completed' | 'failed'
  output_data?: Record<string, unknown> | null
  error_message?: string | null
  started_at?: string | null
  completed_at?: string | null
  input_tokens?: number
  output_tokens?: number
  cost_credits?: number
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
  getById(id: string): Promise<WorkflowRecord | null>
  getNodes(workflowId: string): Promise<WorkflowNodeRecord[]>
  getEdges(workflowId: string): Promise<WorkflowEdgeRecord[]>
  createWorkflow(input: CreateWorkflowInput): Promise<WorkflowRecord>
  updateWorkflow(id: string, input: UpdateWorkflowInput): Promise<WorkflowRecord>
  forkWorkflow(sourceId: string): Promise<WorkflowRecord>
  upsertNodes(workflowId: string, nodes: UpsertNodeInput[]): Promise<WorkflowNodeRecord[]>
  upsertEdges(workflowId: string, edges: UpsertEdgeInput[]): Promise<WorkflowEdgeRecord[]>
  deleteNode(nodeId: string): Promise<void>
  deleteEdge(edgeId: string): Promise<void>
  startRun(workflowId: string, inputs?: Record<string, unknown>, globalModelId?: string): Promise<WorkflowRunRecord>
  getRun(runId: string): Promise<WorkflowRunRecord | null>
  getNodeResults(runId: string): Promise<WorkflowNodeResultRecord[]>
  updateNodeResult(runId: string, nodeId: string, status: string, outputData?: Record<string, unknown>, errorMessage?: string): Promise<void>
  updateRunStatus(runId: string, status: string): Promise<void>
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

  // ── Reads via public.vw_workflows (no schema switch needed) ────────────────

  async listByLenser(lenserId: string): Promise<WorkflowRecord[]> {
    const { data, error } = await supabase
      .from('vw_workflows')
      .select('id, lenser_id, title, description, visibility, battle_count, created_at, updated_at')
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
    const { data, error } = await supabase.rpc('fn_get_my_workflows', {
      p_lenser_id:  lenserId,
      p_offset:     offset,
      p_limit:      limit,
      p_visibility: filter.visibility ?? null,
      p_sort:       filter.sort ?? 'updated_at',
      p_search:     filter.search ?? null,
    })

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
    const { data, error } = await supabase.rpc('fn_workflows_get_popular', {
      p_offset: offset,
      p_limit:  limit,
      p_search: search ?? null,
    })

    if (error) this.handleError(error)

    const rows = (data ?? []) as WorkflowRecord[]
    return paginatedResponse(rows, {
      offset,
      limit,
      hasNextPage: rows.length === limit,
    })
  }

  async getById(id: string): Promise<WorkflowRecord | null> {
    const { data, error } = await supabase
      .from('vw_workflows')
      .select('id, lenser_id, title, description, visibility, battle_count, reaction_totals, fork_count, parent_workflow_id, created_at, updated_at')
      .eq('id', id)
      .maybeSingle()

    if (error) this.handleError(error)
    return data as WorkflowRecord | null
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
    const { data, error } = await supabase.rpc('fn_upsert_workflow_nodes', {
      p_workflow_id: workflowId,
      p_nodes: nodes,
    })

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

  async startRun(workflowId: string, inputs: Record<string, unknown> = {}, globalModelId?: string): Promise<WorkflowRunRecord> {
    const { data, error } = await supabase.rpc('fn_start_workflow_run', {
      p_workflow_id: workflowId,
      p_inputs: inputs,
      p_global_model_id: globalModelId ?? null,
    })

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
