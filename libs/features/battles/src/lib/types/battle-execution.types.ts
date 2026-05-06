import type { FundingSource } from '@lenserfight/types'

// --- Contender Stream State ---

export type ContenderStreamState = 'idle' | 'loading' | 'streaming' | 'complete' | 'error'

export interface ContenderExecutionConfig {
  contenderId: string
  slot: 'A' | 'B'
  providerKey: string
  modelKey: string
  fundingSource: FundingSource
  byokKeyRefId?: string | null
  byokLocalKeyId?: string | null
  lensId: string
  lensContent: string
  maxTokens?: number
}

export interface ContenderStreamSnapshot {
  contenderId: string
  slot: 'A' | 'B'
  state: ContenderStreamState
  output: string
  runId: string | null
  submissionId: string | null
  usage: { input_tokens: number; output_tokens: number } | null
  creditsCharged: number
  error: string | null
  startedAt: number | null
  completedAt: number | null
}

// --- Battle Execution Orchestration ---

export type BattleExecutionPhase =
  | 'pre_flight'
  | 'executing'
  | 'finalizing'
  | 'complete'
  | 'failed'

export interface BattleExecutionState {
  phase: BattleExecutionPhase
  contenderA: ContenderStreamSnapshot
  contenderB: ContenderStreamSnapshot
  battleId: string
  startedAt: number | null
}

// --- Stream Recording (Replay Service) ---

export interface StreamEvent {
  /** Milliseconds since execution start */
  t: number
  /** Token delta (text chunk). Undefined for non-token events. */
  d?: string
  /** Event type: 't' = token, 's' = start, 'e' = end, 'x' = error */
  k: 't' | 's' | 'e' | 'x'
  /** Metadata (usage, error message, etc.) — only on 's', 'e', 'x' events */
  m?: Record<string, unknown>
}

export interface StreamRecording {
  contenderId: string
  slot: 'A' | 'B'
  events: StreamEvent[]
  totalDurationMs: number
  totalTokens: number
  finalOutput: string
}

// --- Execution Config Record (DB shape) ---

export interface ExecutionConfigRecord {
  id: string
  battle_id: string
  contender_id: string | null
  provider_key: string
  model_key: string
  model_id: string | null
  funding_source: string
  byok_key_ref_id: string | null
  max_tokens: number
  temperature: number
  created_at: string
  updated_at: string
}

export interface UpsertExecutionConfigInput {
  battle_id: string
  contender_id?: string | null
  provider_key: string
  model_key: string
  model_id?: string | null
  funding_source: string
  byok_key_ref_id?: string | null
  max_tokens?: number
  temperature?: number
}

// --- Stream Recording Record (DB shape) ---

export interface StreamRecordingRecord {
  id: string
  battle_id: string
  contender_id: string
  slot: string
  events: StreamEvent[]
  total_duration_ms: number
  total_tokens: number
  final_output: string | null
  content_type: string
  created_at: string
}

// --- Helpers ---

export function createEmptySnapshot(contenderId: string, slot: 'A' | 'B'): ContenderStreamSnapshot {
  return {
    contenderId,
    slot,
    state: 'idle',
    output: '',
    runId: null,
    submissionId: null,
    usage: null,
    creditsCharged: 0,
    error: null,
    startedAt: null,
    completedAt: null,
  }
}
