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
  started_at?: string | null
  completed_at?: string | null
  created_at: string
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
}

export interface CreateWorkflowInput {
  lenser_id: string
  title: string
  description?: string
  visibility?: 'public' | 'private' | 'unlisted'
}

export interface UpsertNodeInput {
  id?: string
  lens_id: string
  version_id?: string | null
  position_x: number
  position_y: number
  label?: string
  ordinal?: number
}

export interface UpsertEdgeInput {
  id?: string
  source_node_id: string
  target_node_id: string
  source_output_key?: string
  target_param_label: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Port
// ─────────────────────────────────────────────────────────────────────────────

export interface WorkflowsRepositoryPort {
  listByLenser(lenserId: string): Promise<WorkflowRecord[]>
  getById(id: string): Promise<WorkflowRecord | null>
  getNodes(workflowId: string): Promise<WorkflowNodeRecord[]>
  getEdges(workflowId: string): Promise<WorkflowEdgeRecord[]>
  createWorkflow(input: CreateWorkflowInput): Promise<WorkflowRecord>
  upsertNodes(workflowId: string, nodes: UpsertNodeInput[]): Promise<WorkflowNodeRecord[]>
  upsertEdges(workflowId: string, edges: UpsertEdgeInput[]): Promise<WorkflowEdgeRecord[]>
  deleteNode(nodeId: string): Promise<void>
  deleteEdge(edgeId: string): Promise<void>
  startRun(workflowId: string, inputs?: Record<string, unknown>): Promise<WorkflowRunRecord>
  getRun(runId: string): Promise<WorkflowRunRecord | null>
  getNodeResults(runId: string): Promise<WorkflowNodeResultRecord[]>
}

// ─────────────────────────────────────────────────────────────────────────────
// Supabase Implementation
// ─────────────────────────────────────────────────────────────────────────────

export class SupabaseWorkflowsRepository implements WorkflowsRepositoryPort {
  private handleError(error: unknown): never {
    throw error
  }

  async listByLenser(lenserId: string): Promise<WorkflowRecord[]> {
    const { data, error } = await supabase
      .from('vw_workflows')
      .select('id, lenser_id, title, description, visibility, battle_count, created_at, updated_at')
      .eq('lenser_id', lenserId)
      .order('updated_at', { ascending: false })

    if (error) this.handleError(error)
    return (data ?? []) as WorkflowRecord[]
  }

  async getById(id: string): Promise<WorkflowRecord | null> {
    const { data, error } = await supabase
      .from('vw_workflows')
      .select('id, lenser_id, title, description, visibility, battle_count, created_at, updated_at')
      .eq('id', id)
      .maybeSingle()

    if (error) this.handleError(error)
    return data as WorkflowRecord | null
  }

  async getNodes(workflowId: string): Promise<WorkflowNodeRecord[]> {
    const { data, error } = await supabase
      .schema('lenses')
      .from('workflow_nodes')
      .select('id, workflow_id, lens_id, version_id, position_x, position_y, label, ordinal, created_at')
      .eq('workflow_id', workflowId)
      .order('ordinal', { ascending: true })

    if (error) this.handleError(error)
    return (data ?? []) as WorkflowNodeRecord[]
  }

  async getEdges(workflowId: string): Promise<WorkflowEdgeRecord[]> {
    const { data, error } = await supabase
      .schema('lenses')
      .from('workflow_edges')
      .select('id, workflow_id, source_node_id, target_node_id, source_output_key, target_param_label')
      .eq('workflow_id', workflowId)

    if (error) this.handleError(error)
    return (data ?? []) as WorkflowEdgeRecord[]
  }

  async createWorkflow(input: CreateWorkflowInput): Promise<WorkflowRecord> {
    const { data, error } = await supabase
      .schema('lenses')
      .from('workflows')
      .insert({
        lenser_id: input.lenser_id,
        title: input.title,
        description: input.description ?? null,
        visibility: input.visibility ?? 'public',
      })
      .select('id, lenser_id, title, description, visibility, battle_count, created_at, updated_at')
      .single()

    if (error) this.handleError(error)
    return data as WorkflowRecord
  }

  async upsertNodes(workflowId: string, nodes: UpsertNodeInput[]): Promise<WorkflowNodeRecord[]> {
    const rows = nodes.map((n, i) => ({
      ...(n.id ? { id: n.id } : {}),
      workflow_id: workflowId,
      lens_id: n.lens_id,
      version_id: n.version_id ?? null,
      position_x: n.position_x,
      position_y: n.position_y,
      label: n.label ?? null,
      ordinal: n.ordinal ?? i,
    }))

    const { data, error } = await supabase
      .schema('lenses')
      .from('workflow_nodes')
      .upsert(rows, { onConflict: 'id' })
      .select('id, workflow_id, lens_id, version_id, position_x, position_y, label, ordinal, created_at')

    if (error) this.handleError(error)
    return (data ?? []) as WorkflowNodeRecord[]
  }

  async upsertEdges(workflowId: string, edges: UpsertEdgeInput[]): Promise<WorkflowEdgeRecord[]> {
    const rows = edges.map((e) => ({
      ...(e.id ? { id: e.id } : {}),
      workflow_id: workflowId,
      source_node_id: e.source_node_id,
      target_node_id: e.target_node_id,
      source_output_key: e.source_output_key ?? 'output',
      target_param_label: e.target_param_label,
    }))

    const { data, error } = await supabase
      .schema('lenses')
      .from('workflow_edges')
      .upsert(rows, { onConflict: 'source_node_id,target_node_id,target_param_label' })
      .select('id, workflow_id, source_node_id, target_node_id, source_output_key, target_param_label')

    if (error) this.handleError(error)
    return (data ?? []) as WorkflowEdgeRecord[]
  }

  async deleteNode(nodeId: string): Promise<void> {
    const { error } = await supabase
      .schema('lenses')
      .from('workflow_nodes')
      .delete()
      .eq('id', nodeId)

    if (error) this.handleError(error)
  }

  async deleteEdge(edgeId: string): Promise<void> {
    const { error } = await supabase
      .schema('lenses')
      .from('workflow_edges')
      .delete()
      .eq('id', edgeId)

    if (error) this.handleError(error)
  }

  async startRun(workflowId: string, inputs: Record<string, unknown> = {}): Promise<WorkflowRunRecord> {
    const { data, error } = await supabase.rpc('fn_start_workflow_run', {
      p_workflow_id: workflowId,
      p_inputs: inputs,
    })

    if (error) this.handleError(error)

    // Fetch the created run
    const runId = data as string
    const run = await this.getRun(runId)
    if (!run) throw new Error('Workflow run not found after creation')
    return run
  }

  async getRun(runId: string): Promise<WorkflowRunRecord | null> {
    const { data, error } = await supabase
      .schema('lenses')
      .from('workflow_runs')
      .select('id, workflow_id, triggered_by, status, context_inputs, started_at, completed_at, created_at')
      .eq('id', runId)
      .maybeSingle()

    if (error) this.handleError(error)
    return data as WorkflowRunRecord | null
  }

  async getNodeResults(runId: string): Promise<WorkflowNodeResultRecord[]> {
    const { data, error } = await supabase
      .schema('lenses')
      .from('workflow_node_results')
      .select('id, run_id, node_id, execution_run_id, status, output_data, error_message, started_at, completed_at')
      .eq('run_id', runId)

    if (error) this.handleError(error)
    return (data ?? []) as WorkflowNodeResultRecord[]
  }
}
