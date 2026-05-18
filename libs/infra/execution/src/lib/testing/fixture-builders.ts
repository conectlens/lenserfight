/**
 * Test fixture builders for the QA regression campaign.
 *
 * GRASP — *Pure Fabrication*. Each builder owns the default shape of one
 * domain object so spec files don't repeat type literals and don't drift
 * when fields are added. Builders accept partial overrides.
 *
 * Builders here are intentionally schema-mirroring, not behavior-bearing.
 * They produce inert values; the test wires them into the system under test.
 */

import type {
  WorkflowNode,
  WorkflowEdge,
  WorkflowExecutionContext,
  WorkflowNodeConfig,
} from '../workflow-execution.service'
import type { NodeOutputEnvelope } from '@lenserfight/types'

// ─── Execution run ───────────────────────────────────────────────────────────

export type FixtureExecutionRunStatus =
  | 'queued' | 'running' | 'succeeded' | 'failed' | 'canceled' | 'timed_out'

export interface FixtureExecutionRun {
  id: string
  request_id: string
  status: FixtureExecutionRunStatus
  model_id: string | null
  provider_request_id: string | null
  started_at: string | null
  completed_at: string | null
  latency_ms: number | null
  cost_estimate: number | null
  token_input: number | null
  token_output: number | null
  credit_cost: number | null
  billing_status: 'free' | 'pending' | 'charged' | 'failed'
  error_code: string | null
  error_message: string | null
  created_at: string
}

export function buildExecutionRun(
  overrides: Partial<FixtureExecutionRun> = {},
): FixtureExecutionRun {
  return {
    id:                  'run-00000000-0000-0000-0000-000000000001',
    request_id:          'req-00000000-0000-0000-0000-000000000001',
    status:              'queued',
    model_id:            null,
    provider_request_id: null,
    started_at:          null,
    completed_at:        null,
    latency_ms:          null,
    cost_estimate:       null,
    token_input:         null,
    token_output:        null,
    credit_cost:         null,
    billing_status:      'free',
    error_code:          null,
    error_message:       null,
    created_at:          '2026-05-16T00:00:00.000Z',
    ...overrides,
  }
}

// ─── Workflow node / edge ────────────────────────────────────────────────────

export function buildWorkflowNode(overrides: Partial<WorkflowNode> = {}): WorkflowNode {
  return {
    id:      'node-1',
    lensId:  'lens-00000000-0000-0000-0000-000000000001',
    config:  undefined,
    ...overrides,
  }
}

export function buildWorkflowEdge(overrides: Partial<WorkflowEdge> = {}): WorkflowEdge {
  return {
    sourceNodeId:     'node-1',
    targetNodeId:     'node-2',
    sourceOutputKey:  'text',
    targetParamLabel: 'input',
    ...overrides,
  }
}

export function buildWorkflowNodeConfig(
  overrides: Partial<WorkflowNodeConfig> = {},
): WorkflowNodeConfig {
  return {
    retry: { attempts: 1, backoffMs: 0 } as WorkflowNodeConfig['retry'],
    timeoutMs: 5_000,
    onParentFailure: 'propagate' as WorkflowNodeConfig['onParentFailure'],
    ...overrides,
  }
}

/**
 * Minimal `WorkflowExecutionContext` with stubbed resolvers. Spec files
 * spread overrides over the result to inject real providers/persistence.
 *
 * The two required hooks (`resolveLensTemplate`, `signal`) get safe defaults:
 *   - resolveLensTemplate returns the lensId as the template body
 *   - signal is left undefined so cancellation is opt-in per test
 */
export function buildExecutionContext(
  overrides: Partial<WorkflowExecutionContext> = {},
): WorkflowExecutionContext {
  return {
    runId: 'run-00000000-0000-0000-0000-000000000001',
    rootInputs: {},
    resolveLensTemplate: async (lensId: string) => `lens-template:${lensId}`,
    ...overrides,
  } as WorkflowExecutionContext
}

// ─── Battle contender job ────────────────────────────────────────────────────

export interface FixtureBattleContenderJob {
  job_id: string
  battle_id: string
  contender_id: string
  slot: 'A' | 'B'
  task_prompt: string
  provider_key: string
  model_key: string
  byok_key_ref_id: string | null
  lens_id: string | null
  version_id: string | null
  max_tokens: number
  temperature: number
  retry_count: number
  ai_lenser_id: string | null
  personality_note: string | null
  personality_version_id: string | null
}

export function buildBattleContenderJob(
  overrides: Partial<FixtureBattleContenderJob> = {},
): FixtureBattleContenderJob {
  return {
    job_id:                 'job-00000000-0000-0000-0000-000000000001',
    battle_id:              'battle-00000000-0000-0000-0000-000000000001',
    contender_id:           'contender-00000000-0000-0000-0000-000000000001',
    slot:                   'A',
    task_prompt:            'test prompt',
    provider_key:           'openai',
    model_key:              'gpt-4o',
    byok_key_ref_id:        null,
    lens_id:                null,
    version_id:             null,
    max_tokens:             1024,
    temperature:            0.7,
    retry_count:            0,
    ai_lenser_id:           null,
    personality_note:       null,
    personality_version_id: null,
    ...overrides,
  }
}

// ─── Node output envelope (downstream-readable result of a node run) ────────

export function buildNodeOutputEnvelope(
  overrides: Partial<NodeOutputEnvelope> = {},
): NodeOutputEnvelope {
  return {
    kind: 'text',
    artifactKind: 'text',
    output: 'sample output',
    ...overrides,
  } as NodeOutputEnvelope
}
