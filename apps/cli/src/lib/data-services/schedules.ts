import { callRpc } from '@lenserfight/cli-client'

export interface WorkflowScheduleRow {
  id: string
  workflow_id: string
  workflow_title: string | null
  cron_expr: string
  timezone: string
  is_active: boolean
  assignee_type: 'agent' | 'team'
  assignee_id: string | null
  workflow_assignment_id: string | null
  next_run_at: string | null
  last_run_at: string | null
  last_run_id: string | null
  last_dispatch_status: string | null
  last_error_at: string | null
  last_error_message: string | null
  last_completed_at: string | null
  last_result: Record<string, unknown>
  approval_policy: Record<string, unknown>
  retry_policy: Record<string, unknown>
  failure_policy: Record<string, unknown>
}

export interface ScheduleRunRow {
  id: string
  status: string
  started_at: string | null
  completed_at: string | null
  [key: string]: unknown
}

/** Read-only mirror of commands/schedule.ts's list/inspect RPC calls. */
export async function listSchedules(workflowId?: string): Promise<WorkflowScheduleRow[]> {
  const rows = await callRpc<WorkflowScheduleRow[]>(
    'fn_get_workflow_schedules',
    { p_workflow_id: workflowId || null },
    { requireAuth: true },
  )
  return rows ?? []
}

export async function getScheduleById(scheduleId: string): Promise<WorkflowScheduleRow | null> {
  const rows = await listSchedules()
  return rows.find((r) => r.id === scheduleId) ?? null
}

export async function getScheduleRunHistory(scheduleId: string, limit = 20): Promise<ScheduleRunRow[]> {
  const rows = await callRpc<ScheduleRunRow[]>(
    'fn_get_schedule_run_history',
    { p_schedule_id: scheduleId, p_limit: limit, p_cursor: null },
    { requireAuth: true },
  )
  return rows ?? []
}

/** Schedules whose last dispatch failed — feeds the Home screen's system-warnings card. */
export async function listFailingSchedules(): Promise<WorkflowScheduleRow[]> {
  const rows = await listSchedules()
  return rows.filter((r) => r.last_dispatch_status === 'failed' || !!r.last_error_message)
}
