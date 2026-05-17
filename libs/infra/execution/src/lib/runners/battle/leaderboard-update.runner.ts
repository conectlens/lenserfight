/**
 * LeaderboardUpdateRunner — triggers ELO recomputation after finalization.
 *
 * GRASP Low Coupling: reads the winner from upstream ScoreAggregatorRunner
 * metadata and calls fn_compute_elo_after_battle to refresh ELO ratings and
 * lenserboard rankings. fn_battles_finalize already calls this function
 * internally, so this runner is an explicit idempotent follow-up step that
 * ensures DAG workflows can model the leaderboard-update as a distinct node.
 *
 * Config schema (nodeConfig):
 *   battleId: string — the battle whose ELO to recompute
 */

import type { WorkflowNodeType } from '../../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from '../node-runner.interface'

export class LeaderboardUpdateRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'leaderboard_update'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    const SUPABASE_URL              = globalThis.process?.env?.['SUPABASE_URL'] ?? ''
    const SUPABASE_SERVICE_ROLE_KEY = globalThis.process?.env?.['SUPABASE_SERVICE_ROLE_KEY'] ?? ''

    if (!SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('leaderboard_update: SUPABASE_SERVICE_ROLE_KEY is required — this runner must execute in a server/worker context')
    }

    const startedAt = Date.now()
    const { nodeConfig, signal } = ctx

    const battleId = nodeConfig['battleId'] as string | undefined

    if (!battleId) {
      return {
        output: {
          mediaType: 'text',
          text: '',
          data: {
            error:  'leaderboard_update: battleId is required in nodeConfig',
            nodeId: ctx.nodeId,
          },
          durationMs: 0,
        },
      }
    }

    // Read winnerId from upstream ScoreAggregatorRunner if available.
    let winnerId: string | undefined
    for (const output of ctx.upstreamOutputs.values()) {
      const upstreamWinner = output.metadata?.['winnerId'] as string | undefined
      if (upstreamWinner) {
        winnerId = upstreamWinner
        break
      }
    }

    if (signal?.aborted) {
      throw new Error('Execution aborted')
    }

    const url = `${SUPABASE_URL}/rest/v1/rpc/fn_compute_elo_after_battle`

    const response = await fetch(url, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey':        SUPABASE_SERVICE_ROLE_KEY,
      },
      body:   JSON.stringify({ p_battle_id: battleId }),
      signal: signal,
    })

    if (!response.ok) {
      const body = await response.text().catch(() => response.statusText)
      throw new Error(`leaderboard_update: fn_compute_elo_after_battle returned ${response.status}: ${body}`)
    }

    return {
      output: {
        mediaType: 'text',
        text:      '',
        data: {
          battleId,
          winnerId,
          updated:    true,
          executedBy: 'leaderboard_update_runner',
        },
        durationMs: Date.now() - startedAt,
        metadata: {
          battleId,
          executedBy: 'leaderboard_update_runner',
        },
      },
    }
  }
}
