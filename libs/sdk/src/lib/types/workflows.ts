// SDK public types for Workflows

export type SdkWorkflowRunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

export interface SdkWorkflowSummary {
  id: string
  title: string
  description: string | null
  visibility: string
  createdAt: string
}

export interface SdkWorkflowDetail extends SdkWorkflowSummary {
  updatedAt: string
}

export interface SdkWorkflowRun {
  id: string
  status: SdkWorkflowRunStatus
  createdAt: string
}

export interface SdkWorkflowRunState {
  id: string
  status: SdkWorkflowRunStatus
  activeNodeId: string | null
  creditsSpent: number
}

export interface SdkWorkflowRunLog {
  nodeId: string
  status: string
  result: unknown | null
  error: string | null
  durationMs: number
  tokenCount: number
}
