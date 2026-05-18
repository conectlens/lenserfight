/**
 * VoteCollectorRunner — read-only RPC bridge for battle vote tallies.
 *
 * GRASP Information Expert: owns the logic for retrieving vote counts.
 * Calls fn_get_battle_scores via Supabase REST API, returning a structured
 * vote-by-slot breakdown for downstream nodes (ScoreAggregatorRunner).
 *
 * Config schema (nodeConfig):
 *   battleId: string — the battle to collect votes for
 *
 * Output data shape:
 *   { battleId, votesBySlot: { A: number, B: number }, totalVotes: number }
 */

import type { WorkflowNodeType } from '../../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from '../node-runner.interface'

export class VoteCollectorRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'vote_collector'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    const SUPABASE_URL              = globalThis.process?.env?.['SUPABASE_URL'] ?? ''
    const SUPABASE_SERVICE_ROLE_KEY = globalThis.process?.env?.['SUPABASE_SERVICE_ROLE_KEY'] ?? ''

    if (!SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('vote_collector: SUPABASE_SERVICE_ROLE_KEY is required — this runner must execute in a server/worker context')
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
            error:  'vote_collector: battleId is required in nodeConfig',
            nodeId: ctx.nodeId,
          },
          durationMs: 0,
        },
      }
    }

    if (signal?.aborted) {
      throw new Error('Execution aborted')
    }

    const url = `${SUPABASE_URL}/rest/v1/rpc/fn_get_battle_scores`

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
      throw new Error(`vote_collector: fn_get_battle_scores returned ${response.status}: ${body}`)
    }

    const rows = await response.json() as Array<{ slot: string; vote_count: number }>

    const votesBySlot: Record<string, number> = { A: 0, B: 0 }
    let totalVotes = 0
    for (const row of rows ?? []) {
      votesBySlot[row.slot] = row.vote_count
      totalVotes += row.vote_count
    }

    return {
      output: {
        mediaType: 'text',
        text:      '',
        data: {
          battleId,
          votesBySlot,
          totalVotes,
          executedBy: 'vote_collector_runner',
        },
        durationMs: Date.now() - startedAt,
        metadata: {
          battleId,
          executedBy: 'vote_collector_runner',
        },
      },
    }
  }
}
