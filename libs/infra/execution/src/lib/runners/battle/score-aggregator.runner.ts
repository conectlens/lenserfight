/**
 * ScoreAggregatorRunner — finalizes a battle after votes are collected.
 *
 * GRASP Controller: orchestrates the finalization step. It reads vote tallies
 * from upstream VoteCollectorRunner outputs (or directly from nodeConfig as
 * a fallback), then calls fn_battles_finalize which handles winner
 * determination, ELO recalculation, and status transition to 'closed'.
 *
 * Config schema (nodeConfig):
 *   battleId: string — the battle to finalize
 *
 * Upstream: VoteCollectorRunner (slot_A/slot_B vote counts in data)
 * Downstream: LeaderboardUpdateRunner
 */

import type { WorkflowNodeType } from '../../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from '../node-runner.interface'

export class ScoreAggregatorRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'score_aggregator'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    const SUPABASE_URL              = globalThis.process?.env?.['SUPABASE_URL'] ?? ''
    const SUPABASE_SERVICE_ROLE_KEY = globalThis.process?.env?.['SUPABASE_SERVICE_ROLE_KEY'] ?? ''

    if (!SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('score_aggregator: SUPABASE_SERVICE_ROLE_KEY is required — this runner must execute in a server/worker context')
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
            error:  'score_aggregator: battleId is required in nodeConfig',
            nodeId: ctx.nodeId,
          },
          durationMs: 0,
        },
      }
    }

    // Collect vote tallies from upstream VoteCollectorRunner outputs.
    let votesBySlot: Record<string, number> = { A: 0, B: 0 }
    for (const output of ctx.upstreamOutputs.values()) {
      const upstreamVotes = output.data?.['votesBySlot'] as Record<string, number> | undefined
      if (upstreamVotes) {
        votesBySlot = upstreamVotes
        break
      }
    }

    if (signal?.aborted) {
      throw new Error('Execution aborted')
    }

    // fn_battles_finalize handles: winner determination, ELO, status → 'closed'
    const url = `${SUPABASE_URL}/rest/v1/rpc/fn_battles_finalize`

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
      throw new Error(`score_aggregator: fn_battles_finalize returned ${response.status}: ${body}`)
    }

    const payload = await response.json().catch(() => ({})) as Record<string, unknown>

    return {
      output: {
        mediaType: 'text',
        text:      '',
        data: {
          battleId,
          votesBySlot,
          finalized:  true,
          winnerId:   payload['winner_id'] as string | undefined,
          executedBy: 'score_aggregator_runner',
        },
        durationMs: Date.now() - startedAt,
        metadata: {
          battleId,
          winnerId:   payload['winner_id'] as string | undefined,
          executedBy: 'score_aggregator_runner',
        },
      },
    }
  }
}
