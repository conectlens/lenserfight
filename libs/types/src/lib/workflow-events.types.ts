export type WorkflowSseEventType =
  | 'run.status.changed'
  | 'run.started'
  | 'run.completed'
  | 'run.failed'
  | 'run.cancelled'
  | 'node.started'
  | 'node.completed'
  | 'node.failed'
  | 'node.cancelled'
  | 'node.skipped'
  | 'node.retried'
  | 'message.delta'
  | 'message.completed'
  | 'tool.started'
  | 'tool.progress'
  | 'tool.completed'
  | 'tool.failed'
  | 'tool.approval_required'
  | 'tool.approval_response'
  | 'heartbeat'

export interface WorkflowSseEventEnvelope<
  TType extends WorkflowSseEventType = WorkflowSseEventType,
  TPayload = Record<string, unknown>,
> {
  eventId: number
  type: TType
  runId: string
  timestamp: string
  payload: TPayload
}

export interface WorkflowSseNodePayload {
  runId: string
  nodeId: string
  status?: string
  message?: string
  output?: string
  attempts?: number
}
