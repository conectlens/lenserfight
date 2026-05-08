export type AutomationActionKind = 'dispatch_workflow' | 'webhook' | 'notify'

export interface TriggerRuleRecord {
  id: string
  lenser_id: string
  name: string
  match_event_type: string
  match_filter: Record<string, unknown> | null
  action_kind: AutomationActionKind
  action_config: Record<string, unknown> | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type EventDispatchStatus = 'queued' | 'dispatched' | 'failed' | 'skipped'

export interface EventDispatchRecord {
  event_id: string
  rule_id: string
  status: EventDispatchStatus
  attempted_at: string | null
  error: string | null
}

export interface RuleDispatchSummary {
  rule_id: string
  dispatched_count: number
  failed_count: number
  skipped_count: number
  queued_count: number
  last_attempted_at: string | null
}
