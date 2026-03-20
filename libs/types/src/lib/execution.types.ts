// Execution schema types — mirror execution.* Supabase tables in camelCase.
// These are schema-driven: every field corresponds to a real DB column.

export type ExecutionRunStatus =
  | 'queued'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'canceled'
  | 'timed_out'

export type ExecutionBillingStatus = 'free' | 'pending' | 'charged' | 'failed'

export type ArtifactKind =
  | 'text'
  | 'image'
  | 'audio'
  | 'video'
  | 'json'
  | 'trace'
  | 'tool_log'
  | 'rubric_result'

export type FundingSource =
  | 'user_byok_cloud'
  | 'user_byok_local'
  | 'platform_credit'
  | 'sponsored'

export type ExecutionOriginType =
  | 'battle'
  | 'content_preview'
  | 'template_test'
  | 'forum'
  | 'api'
  | 'cli'

export type StepType =
  | 'prompt'
  | 'tool_call'
  | 'tool_result'
  | 'model_call'
  | 'judge_call'
  | 'retrieval'
  | 'transform'

/** Mirrors execution.runs */
export interface ExecutionRun {
  id: string
  requestId: string
  status: ExecutionRunStatus
  modelId: string | null
  agentAdapterId: string | null
  providerRequestId: string | null
  executionHash: string | null
  inputHash: string | null
  outputHash: string | null
  startedAt: string | null
  completedAt: string | null
  latencyMs: number | null
  costEstimate: number | null
  tokenInput: number | null
  tokenOutput: number | null
  creditCost: number | null
  billingStatus: ExecutionBillingStatus
  errorCode: string | null
  errorMessage: string | null
  createdAt: string
}

/** Mirrors execution.artifacts */
export interface ExecutionArtifact {
  id: string
  runId: string
  artifactKind: ArtifactKind
  contentText: string | null
  contentJson: unknown | null
  visibility: 'private' | 'public' | 'contender_only'
  isPrimaryOutput: boolean
  createdAt: string
}

/** Mirrors execution.requests */
export interface ExecutionRequest {
  id: string
  requesterLenserId: string
  originType: ExecutionOriginType
  originId: string | null
  agentAdapterId: string | null
  modelId: string | null
  promptTemplateId: string | null
  inputSnapshot: Record<string, unknown>
  runtimeOrigin: 'cloud' | 'local' | 'hybrid' | 'offline_import'
  fundingSource: FundingSource
  byokKeyRefId: string | null
  createdAt: string
}

/** Mirrors execution.steps */
export interface ExecutionStep {
  id: string
  runId: string
  ordinal: number
  stepType: StepType
  toolName: string | null
  inputSnapshot: Record<string, unknown> | null
  outputSnapshot: Record<string, unknown> | null
  startedAt: string | null
  completedAt: string | null
  latencyMs: number | null
  status: 'pending' | 'running' | 'succeeded' | 'failed'
  createdAt: string
}

/** content.prompt_executions — join record linking a prompt to a run */
export interface PromptExecutionRecord {
  id: string
  promptId: string
  lenserId: string
  executionRunId: string | null
  paymentMethod: 'byok' | 'wallet' | 'free'
  createdAt: string
  // Hydrated at read time for timeline display
  run?: ExecutionRun
  artifacts?: ExecutionArtifact[]
}

// --- HTTP API DTOs (VITE_API_URL) ---

export interface TriggerExecutionDTO {
  prompt_template_id: string
  model_id: string
  input_snapshot: Record<string, unknown>
  funding_source: FundingSource
  origin_type: ExecutionOriginType
  byok_key_ref_id?: string
}

export interface TriggerExecutionResponse {
  execution_run_id: string
  request_id: string
  status: ExecutionRunStatus
}
