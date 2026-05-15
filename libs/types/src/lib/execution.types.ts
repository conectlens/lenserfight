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
  | 'pdf'
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
  | 'lens_preview'
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

/** Visibility for execution artifacts. Enforced by RLS + fn_set_artifact_visibility. */
export type ArtifactVisibility = 'private' | 'public' | 'contender_only' | 'archived'

/** Mirrors execution.artifacts */
export interface ExecutionArtifact {
  id: string
  runId: string
  artifactKind: ArtifactKind
  contentText: string | null
  contentJson: unknown | null
  visibility: ArtifactVisibility
  isPrimaryOutput: boolean
  /** @deprecated Use mediaObjectId. FK to ai.resources. */
  resourceId?: string | null
  /** FK to media.objects. New canonical reference for generated media outputs. */
  mediaObjectId?: string | null
  /** Extensible output type — superset of artifactKind. Prefer for new writes. */
  outputType?: string | null
  createdAt: string
}

/** DTO for fn_set_artifact_visibility RPC */
export interface SetArtifactVisibilityDTO {
  artifactId: string
  visibility: ArtifactVisibility
}

/** Mirrors execution.requests */
export interface ExecutionRequest {
  id: string
  requesterLenserId: string
  originType: ExecutionOriginType
  originId: string | null
  modelId: string | null
  lensId: string | null
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

/** execution.ray_runs — join record linking a lens to a run */
export interface LensExecutionRecord {
  id: string
  lensId: string
  lenserId: string
  /** FK to execution.runs (renamed from executionRunId). */
  runId: string | null
  paymentMethod: 'byok' | 'wallet' | 'free'
  /** FK to lenses.versions. NULL for legacy pre-versioning runs. */
  versionId?: string | null
  createdAt: string
  // Hydrated at read time for timeline display
  run?: ExecutionRun
  artifacts?: ExecutionArtifact[]
}

/** @deprecated Use LensExecutionRecord */
export type PromptExecutionRecord = LensExecutionRecord

/**
 * Enriched execution history item returned by fn_get_lens_execution_history.
 * Replaces the deprecated ray_runs-based LensExecutionRecord for timeline display.
 * Includes model key, provider key, and version number for badge rendering.
 */
export interface LensExecutionHistoryItem {
  requestId: string
  lensId: string
  versionId: string | null
  versionNumber: number | null
  modelId: string | null
  modelKey: string | null
  providerKey: string | null
  fundingSource: FundingSource
  runId: string | null
  runStatus: ExecutionRunStatus | null
  latencyMs: number | null
  tokenInput: number | null
  tokenOutput: number | null
  creditCost: number | null
  createdAt: string
  // Hydrated at read time
  artifacts?: ExecutionArtifact[]
}

/** Mirrors execution.request_attachments */
export interface RequestAttachment {
  id: string
  requestId: string
  mediaObjectId: string
  bindingKey: string
  attachedAt: string
}

// --- HTTP API DTOs (API_URL) ---

/**
 * Parameters for generative media executions (image / video / audio).
 * Stored in execution.requests.input_snapshot under the key "generative_media_params".
 * All fields beyond output_modality are optional and provider-specific.
 */
export interface GenerativeMediaParams {
  output_modality: 'image' | 'video' | 'audio' | 'music'
  // image
  width?: number
  height?: number
  aspect_ratio?: string
  quality?: 'standard' | 'hd'
  style?: string
  /** Number of images to generate (1–4). */
  n?: number
  // video
  duration_s?: number
  fps?: number
  // audio / music
  voice_id?: string
  speed?: number
  format?: 'mp3' | 'wav' | 'opus' | 'flac'
  // shared
  negative_prompt?: string
  seed?: number
}

export interface TriggerExecutionDTO {
  /** Legacy path — lens asset id. Use version_id for versioned executions. */
  lens_id?: string
  /** Versioned path — references content.lens_versions. Takes precedence over lens_id. */
  version_id?: string
  model_id: string
  /** Scalar parameter values (backward compat). Typed bindings use execution.inputs. */
  input_snapshot: Record<string, unknown>
  /** Resource bindings for the version's named slots (migration 42). */
  resource_bindings?: { resource_id: string; binding_key: string }[]
  /** File attachment bindings for 'file' type parameters. Each maps a media_object_id
   *  to the parameter key (binding_key). Written to execution.request_attachments. */
  attachment_bindings?: { media_object_id: string; binding_key: string }[]
  funding_source: FundingSource
  origin_type: ExecutionOriginType
  byok_key_ref_id?: string
  /** The AI lenser executing on behalf of the user. NULL/absent = human-owned run. */
  ai_lenser_id?: string
  /** Present for generative media executions (image/video/audio/music). */
  generative_media_params?: GenerativeMediaParams
}

/** Typed input binding — mirrors execution.inputs */
export type ExecutionInputType = 'parameter' | 'resource' | 'tool_input'

export interface ExecutionInput {
  id: string
  runId: string
  inputType: ExecutionInputType
  bindingKey: string
  scalarValue?: string | null
  resourceId?: string | null
  resourceSnapshot?: unknown
  metadata?: unknown
  createdAt: string
}

export interface TriggerExecutionResponse {
  execution_run_id: string
  request_id: string
  status: ExecutionRunStatus
}

/** DTO for persisting a local BYOK execution to the database after streaming completes. */
export interface PersistLocalExecutionDTO {
  lensId: string
  versionId?: string
  provider: string
  model: string
  contentText: string
  tokenInput: number
  tokenOutput: number
}

/** Semantic alias — a RayRun is an ExecutionRun produced from a Lens execution */
export type RayRun = ExecutionRun

// --- Trusted Local Execution types (mirrors execution.attestations + execution.trust_evaluations) ---

/** How trustworthy a battle submission's execution is. Ordered from least to most trusted. */
export type TrustLevel =
  | 'unverified'
  | 'account_verified'
  | 'agent_verified'
  | 'device_verified'
  | 'runner_verified'
  | 'execution_verified'
  | 'fully_trusted'

/** Mirrors execution.attestations — signed execution metadata captured by local runner. */
export interface ExecutionAttestationRecord {
  id: string
  runId: string
  deviceId: string | null
  signed: boolean
  signature: string | null
  gatewayVerified: boolean
  deviceTrusted: boolean
  policyPassed: boolean
  workflowHash: string | null
  lensHash: string | null
  agentConfigHash: string | null
  runnerVersion: string | null
  cliVersion: string | null
  createdAt: string
}

/** Mirrors execution.trust_evaluations — computed trust level per battle submission. */
export interface ExecutionTrustEvaluation {
  id: string
  submissionId: string
  attestationId: string | null
  trustLevel: TrustLevel
  factors: Record<string, boolean>
  evaluatedAt: string
}

/** Structured metadata stored in battles.submissions.metadata JSONB column. */
export interface BattleSubmissionMetadata {
  ownerAccountId?: string
  humanProfileId?: string
  participantType?: 'human' | 'agent' | 'team'
  agentId?: string
  runnerId?: string
  deviceId?: string
  executionMode?: 'local-trusted' | 'cloud' | 'hybrid' | 'manual'
  workflowId?: string
  lensId?: string
  attestation?: {
    signed: boolean
    signatureId?: string
    gatewayVerified: boolean
    deviceTrusted: boolean
    policyPassed: boolean
  }
}
