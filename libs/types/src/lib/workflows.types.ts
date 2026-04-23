export type WorkflowTriggerMode = 'manual' | 'schedule' | 'subflow'

export type WorkflowScheduleDispatchStatus =
  | 'dispatched'
  | 'skipped_overlap'
  | 'validation_failed'
  | 'dispatch_failed'
  | 'paused'
  | null

export interface WorkflowScheduleRecord {
  id: string
  workflow_id: string
  workflow_title: string
  cron_expr: string
  global_model_id: string | null
  inputs_template: Record<string, unknown>
  is_active: boolean
  last_run_at: string | null
  last_run_id: string | null
  last_dispatch_status: WorkflowScheduleDispatchStatus
  last_error_at: string | null
  last_error_message: string | null
  created_at: string
}

export interface UpsertWorkflowScheduleInput {
  workflow_id: string
  schedule_id?: string | null
  cron_expr: string
  global_model_id?: string | null
  inputs_template?: Record<string, unknown>
  is_active?: boolean
}
