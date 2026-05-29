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

/**
 * Phase CT — Battle automation config persisted into `battles.battles.automation_config`.
 * Surfaced by step 9 of CreateBattleWizard. Stored as JSONB (size-capped at 8KB
 * by the DB CHECK constraint).
 */
export interface BattleAutomationConfig {
  /** Auto-assign AI lensers to empty contender slots before the battle starts. */
  autoAssignContenders?: boolean
  /** Promote draft → open automatically when all readiness checks pass. */
  autoPromote?: boolean
  /** Optional workflow to attach for automated battle progression. */
  workflowId?: string
  /** Optional cron-based schedule (advanced, requires workflowId). */
  schedule?: {
    cron: string
    timezone: string
  }
}

/**
 * Optional automation_config field accepted by fn_battles_create / fn_update_battle.
 * Defaulted to `{}` server-side when omitted.
 */
export interface BattleCreateAutomationOptions {
  automation_config?: BattleAutomationConfig
}
