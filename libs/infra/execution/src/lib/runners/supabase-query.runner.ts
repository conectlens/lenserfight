/**
 * SupabaseQueryRunner — execute allowlisted Supabase RPCs.
 *
 * GRASP Information Expert: knows how to validate RPC names against an
 * allowlist and structure the query request for the engine.
 *
 * Config schema (nodeConfig):
 *   rpcName: string — name of the Supabase RPC to call
 *   params?: Record<string, unknown> — parameters to pass to the RPC
 *
 * Security:
 * - RPC names are validated against a static allowlist.
 * - No arbitrary SQL. Only pre-defined RPCs.
 * - Params are passed as-is (the RPC is responsible for validation).
 */

import type { WorkflowNodeType } from '../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './node-runner.interface'

/**
 * Allowlisted RPCs that workflow nodes may call.
 * Extend this list as new safe RPCs are added to the platform.
 */
const ALLOWED_RPCS = new Set([
  'fn_search_lenser_memory',
  'fn_get_lenser_memory',
  'fn_upsert_lenser_memory',
  'fn_get_workflow_run_results',
  'fn_get_battle_scores',
  'fn_profile_completion_score',
  'fn_xp_leaderboard',
])

export class SupabaseQueryRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'supabase_query'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    const rpcName = ctx.nodeConfig['rpcName'] as string | undefined
    const params = ctx.nodeConfig['params'] as Record<string, unknown> | undefined

    if (!rpcName || typeof rpcName !== 'string') {
      return {
        output: {
          mediaType: 'text',
          text: '',
          data: { error: 'No RPC name configured' },
          durationMs: 0,
        },
      }
    }

    if (!ALLOWED_RPCS.has(rpcName)) {
      return {
        output: {
          mediaType: 'text',
          text: '',
          data: {
            error: `RPC "${rpcName}" is not in the allowlist`,
            allowedRpcs: [...ALLOWED_RPCS],
          },
          durationMs: 0,
        },
      }
    }

    // Emit query request envelope — the engine dispatches to Supabase
    return {
      output: {
        mediaType: 'text',
        text: `[Supabase RPC: ${rpcName}]`,
        data: {
          __supabase_query_request: true,
          rpcName,
          params: params ?? {},
        },
        durationMs: 0,
      },
      variableMutations: {
        __supabase_rpc: rpcName,
      },
    }
  }
}

/** Exposed for testing — check if an RPC name is allowed. */
export function isRpcAllowed(name: string): boolean {
  return ALLOWED_RPCS.has(name)
}
