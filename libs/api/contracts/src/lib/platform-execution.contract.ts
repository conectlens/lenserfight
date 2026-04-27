import type { ApiResponseEnvelope } from './envelope'
import type { ArtifactKind, ExecutionRunStatus, FundingSource } from '@lenserfight/types'

export interface LensExecuteRequest {
  params: Record<string, unknown>
  modelOverride?: string
  providerOverride?: string
  fundingSource?: FundingSource
  byokKeyRefId?: string
  idempotencyKey?: string
}

export interface WorkflowRunRequest {
  inputs: Record<string, unknown>
  modelOverride?: string
  idempotencyKey?: string
}

export interface PlatformExecutionAccepted {
  runId: string
  status: ExecutionRunStatus
  workflowId?: string
}

export interface PlatformExecutionArtifact {
  id: string
  artifactKind: ArtifactKind
  contentText: string | null
  contentJson: unknown | null
  isPrimaryOutput: boolean
  visibility: string
  createdAt: string
}

export interface PlatformRunStatus {
  id: string
  requestId: string
  status: ExecutionRunStatus
  modelId: string | null
  modelKey: string | null
  providerKey: string | null
  startedAt: string | null
  completedAt: string | null
  latencyMs: number | null
  tokenInput: number | null
  tokenOutput: number | null
  creditCost: number | null
  billingStatus: string | null
  errorCode: string | null
  errorMessage: string | null
  artifacts: PlatformExecutionArtifact[]
}

export type LensExecuteResponse = ApiResponseEnvelope<PlatformExecutionAccepted>
export type WorkflowRunResponse = ApiResponseEnvelope<PlatformExecutionAccepted>
export type RunStatusResponse = ApiResponseEnvelope<PlatformRunStatus>
