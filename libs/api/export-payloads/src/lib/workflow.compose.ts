import type { RpcCaller } from './rpc-caller'
import type {
  WorkflowEdgeExportRecord,
  WorkflowExportPayload,
  WorkflowNodeExportRecord,
} from '@lenserfight/shared/serializers'

interface WorkflowDetailRow {
  id: string
  title?: string | null
  description?: string | null
  visibility?: string | null
  battle_count?: number | null
  fork_count?: number | null
  parent_workflow_id?: string | null
  parent_workflow_title?: string | null
  created_at?: string | null
  updated_at?: string | null
}

interface WorkflowNodeRow {
  id: string
  lens_id?: string | null
  version_id?: string | null
  label?: string | null
  ordinal?: number | null
  config?: Record<string, unknown> | null
}

interface WorkflowEdgeRow {
  source_node_id: string
  target_node_id: string
  source_output_key: string
  target_param_label: string
}

interface WorkflowBootstrapRow {
  workflow: WorkflowDetailRow | null
  nodes: WorkflowNodeRow[] | null
  edges: WorkflowEdgeRow[] | null
}

/**
 * Composes a WorkflowExportPayload from `fn_get_workflow_bootstrap`,
 * which returns the workflow header plus its full node/edge graph in one
 * call — the same RPC the WorkflowBuilderPage bootstraps from.
 *
 * Per the confirmed export scope, only the definition graph is exported;
 * run history is out of scope and this RPC never returns it.
 */
export async function composeWorkflowPayload(
  rpc: RpcCaller,
  workflowId: string,
): Promise<WorkflowExportPayload> {
  const rows = await rpc<WorkflowBootstrapRow[]>('fn_get_workflow_bootstrap', {
    p_workflow_id: workflowId,
  })
  const row = rows[0]
  if (!row?.workflow) throw new Error(`Workflow not found: ${workflowId}`)

  const workflow = row.workflow
  const nodes: WorkflowNodeExportRecord[] = (row.nodes ?? []).map((n) => ({
    id: n.id,
    ordinal: n.ordinal ?? 0,
    label: n.label ?? null,
    lens_id: n.lens_id ?? null,
    version_id: n.version_id ?? null,
    config: n.config ?? null,
  }))
  const edges: WorkflowEdgeExportRecord[] = (row.edges ?? []).map((e) => ({
    source_node_id: e.source_node_id,
    target_node_id: e.target_node_id,
    source_output_key: e.source_output_key,
    target_param_label: e.target_param_label,
  }))

  return {
    id: workflow.id,
    title: workflow.title ?? workflow.id,
    description: workflow.description ?? null,
    visibility: workflow.visibility ?? undefined,
    node_count: nodes.length,
    battle_count: workflow.battle_count ?? undefined,
    fork_count: workflow.fork_count ?? undefined,
    parent_workflow_id: workflow.parent_workflow_id ?? null,
    parent_workflow_title: workflow.parent_workflow_title ?? null,
    created_at: workflow.created_at ?? undefined,
    updated_at: workflow.updated_at ?? undefined,
    nodes,
    edges,
  }
}
