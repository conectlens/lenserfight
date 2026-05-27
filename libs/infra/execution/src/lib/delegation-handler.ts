import type { DelegationPolicy } from './workflow-execution.service'
import type { SupabaseClient } from '@supabase/supabase-js'

// Phase AL — delegation handler.
//
// The workflow execution service calls this when it encounters a
// `delegate_to_agent` node. The handler is responsible for spawning a
// child agents.team_runs row via the agents.fn_start_team_run RPC.
//
// We split the contract from the implementation so:
//   - Tests can substitute a NullDelegationHandler that throws by default.
//   - Local-dev runtimes without a Supabase service client (echo provider,
//     CLI dry-run) can opt out without 'undefined is not a function' surprises.

export interface DelegationDispatchInput {
  /** agents.ai_lensers.id — the agent the workflow is delegating to. */
  aiLenserId: string
  /** lenses.workflows.id — the workflow being dispatched. */
  workflowId: string
  /** Inputs passed through to the child workflow. */
  inputs: Record<string, unknown>
  /** Effective DelegationPolicy resolved by `resolveDelegationPolicy`. */
  policy: DelegationPolicy
}

export interface DelegationDispatchResult {
  /** agents.team_runs.id of the spawned child run. */
  teamRunId: string
}

/** Polymorphic dispatcher — Phase AL ships Supabase + Null impls. */
export interface IDelegationHandler {
  dispatchTeamRun(input: DelegationDispatchInput): Promise<DelegationDispatchResult>
}

/**
 * Production handler — calls agents.fn_start_team_run via the service
 * client. RLS does not apply (SECURITY DEFINER on the RPC), so callers
 * must have already validated the parent workflow's delegation policy.
 */
export class SupabaseDelegationHandler implements IDelegationHandler {
  constructor(private readonly client: SupabaseClient) {}

  async dispatchTeamRun(input: DelegationDispatchInput): Promise<DelegationDispatchResult> {
    const { data, error } = await this.client
      .rpc('fn_start_team_run', {
        p_ai_lenser_id: input.aiLenserId,
        p_workflow_id:  input.workflowId,
        p_inputs:       input.inputs,
        p_policy:       input.policy,
      })

    if (error) {
      // The RPC raises with HINT='Workflow node delegationPolicy=forbidden'
      // when policy=forbidden — the workflow engine catches and surfaces
      // it as a node failure with code=delegation_forbidden.
      throw new Error(error.message || 'delegation_dispatch_failed')
    }

    if (typeof data !== 'string') {
      throw new Error('delegation_dispatch_failed: missing team_run_id')
    }

    return { teamRunId: data }
  }
}

/**
 * Tests / dry-runs / local-dev get this — throws on any dispatch attempt
 * with a stable error code, so callers know the runtime is intentionally
 * detached from a real Supabase backend.
 */
export class NullDelegationHandler implements IDelegationHandler {
  async dispatchTeamRun(_input: DelegationDispatchInput): Promise<DelegationDispatchResult> {
    throw new Error('delegation_not_configured')
  }
}
