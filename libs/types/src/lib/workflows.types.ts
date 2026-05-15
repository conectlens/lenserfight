export type WorkflowTriggerMode = 'manual' | 'schedule' | 'subflow'

export interface WorkflowScheduleRunHistoryRecord {
  id: string
  workflow_id: string
  status: string
  scheduled_for: string
  started_at: string | null
  completed_at: string | null
  error_message: string | null
  created_at: string
}

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
  timezone: string
  global_model_id: string | null
  inputs_template: Record<string, unknown>
  is_active: boolean
  assignee_type: 'agent' | 'team'
  assignee_id: string | null
  workflow_assignment_id: string | null
  approval_policy: Record<string, unknown>
  retry_policy: Record<string, unknown>
  failure_policy: Record<string, unknown>
  queue_policy: Record<string, unknown>
  next_run_at: string | null
  last_run_at: string | null
  last_run_id: string | null
  last_dispatch_status: WorkflowScheduleDispatchStatus
  last_error_at: string | null
  last_error_message: string | null
  last_completed_at: string | null
  last_result: Record<string, unknown>
  created_at: string
}

export interface UpsertWorkflowScheduleInput {
  workflow_id: string
  schedule_id?: string | null
  cron_expr: string
  timezone?: string
  global_model_id?: string | null
  inputs_template?: Record<string, unknown>
  is_active?: boolean
  description?: string | null
  assignee_type?: 'agent' | 'team'
  assignee_id?: string | null
  workflow_assignment_id?: string | null
  approval_policy?: Record<string, unknown>
  retry_policy?: Record<string, unknown>
  failure_policy?: Record<string, unknown>
  queue_policy?: Record<string, unknown>
}

// ─── Workflow Phases & Tasks ──────────────────────────────────────────────────

export type WorkflowTaskOutputType = 'text' | 'image' | 'video' | 'audio' | 'file'

export interface WorkflowPhaseRecord {
  id: string
  workflow_id: string
  title: string
  description: string | null
  ordinal: number
  created_at: string
  updated_at: string
}

export interface WorkflowTaskRecord {
  id: string
  phase_id: string
  workflow_id: string
  title: string
  prompt_text: string | null
  output_type: WorkflowTaskOutputType
  model_hint: string | null
  ordinal: number
  created_at: string
  updated_at: string
}

export interface WorkflowPhaseWithTasks extends WorkflowPhaseRecord {
  tasks: WorkflowTaskRecord[]
}
