/**
 * CLI data facade — execution history and workflow run listing.
 * Mirrors `executionRepository` / `workflowsRepository` RPC contracts.
 */
import type { CrossAgentFeedItem, LensExecutionHistoryItem } from '@lenserfight/types'
import { callRpc } from '../../utils/api'
import { getHumanActivityFeed } from './agent-workspace'

export type { CrossAgentFeedItem, LensExecutionHistoryItem }

export interface WorkflowRunListRow {
  id: string
  workflow_id: string
  status: string
  trigger_mode?: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
  global_model_id?: string | null
  spent_credits?: number | null
  active_node_id?: string | null
  parent_run_id?: string | null
}

export interface ExecutionPlatformStatus {
  system_kill_switch_active: boolean
  queue_frozen: boolean
  frozen_reason: string | null
  active_run_count: number
  queued_run_count: number
  active_battle_job_count: number
  queued_battle_job_count: number
  active_worker_count: number
  stale_worker_count: number
  dlq_workflow_count: number
  dlq_battle_count: number
}

export interface ListRecentWorkflowRunsOptions {
  workflowId?: string
  status?: string
  limit?: number
}

/** Cross-agent activity feed — default personal execution history (`fn_get_human_activity_feed`). */
export async function getMyExecutionActivityFeed(
  limit = 25,
  offset = 0,
): Promise<CrossAgentFeedItem[]> {
  return getHumanActivityFeed(limit, offset)
}

/** Lens-scoped prompt/model execution history (`fn_get_lens_execution_history`). */
export async function getLensExecutionHistory(
  lensId: string,
  limit = 25,
  offset = 0,
): Promise<LensExecutionHistoryItem[]> {
  const rows = await callRpc<LensExecutionHistoryItem[]>(
    'fn_get_lens_execution_history',
    { p_lens_id: lensId, p_limit: limit, p_offset: offset },
    { requireAuth: true },
  )
  return Array.isArray(rows) ? rows : []
}

/** Owner-scoped workflow runs for one workflow (`fn_list_workflow_runs`). */
export async function listWorkflowRuns(
  workflowId: string,
  limit = 25,
  offset = 0,
): Promise<WorkflowRunListRow[]> {
  const rows = await callRpc<WorkflowRunListRow[]>(
    'fn_list_workflow_runs',
    { p_workflow_id: workflowId, p_limit: limit, p_offset: offset },
    { requireAuth: true },
  )
  return Array.isArray(rows) ? rows : []
}

/** Recent workflow runs. With workflowId uses fn_list_workflow_runs;
 *  without it uses fn_list_recent_workflow_runs (cross-workflow, current user).
 */
export async function listRecentWorkflowRuns(
  options: ListRecentWorkflowRunsOptions = {},
): Promise<WorkflowRunListRow[]> {
  const limit = options.limit ?? 25
  let rows: WorkflowRunListRow[]
  if (options.workflowId) {
    const r = await callRpc<WorkflowRunListRow[]>(
      'fn_list_workflow_runs',
      { p_workflow_id: options.workflowId, p_limit: limit, p_offset: 0 },
      { requireAuth: true },
    )
    rows = Array.isArray(r) ? r : []
  } else {
    const r = await callRpc<WorkflowRunListRow[]>(
      'fn_list_recent_workflow_runs',
      { p_limit: limit, p_offset: 0 },
      { requireAuth: true },
    )
    rows = Array.isArray(r) ? r : []
  }
  if (!options.status) return rows
  return rows.filter((r) => r.status === options.status)
}

/** Platform execution health snapshot (`fn_get_execution_status`). */
export async function getExecutionPlatformStatus(): Promise<ExecutionPlatformStatus> {
  return callRpc<ExecutionPlatformStatus>('fn_get_execution_status', {}, { requireAuth: true })
}
