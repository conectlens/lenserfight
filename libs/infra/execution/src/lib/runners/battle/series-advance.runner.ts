/**
 * SeriesAdvanceRunner — advances a battle series by one round, or finalizes
 * it when the last round resolves.
 *
 * Delegates to fn_advance_series(p_series_id), which atomically:
 *   - validates the current round has a winner,
 *   - creates the next round battle and bumps current_round, OR
 *   - flips status to 'complete' on the final round.
 *
 * When the current round battle isn't finalized yet the RPC raises
 * `current_round_has_no_winner`; this runner converts that into a retry
 * envelope so the workflow can wait and try again.
 *
 * Config schema (nodeConfig):
 *   seriesId: string — the series to advance.
 */

import type { WorkflowNodeType } from '../../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from '../node-runner.interface'

const RETRY_AFTER_SECONDS = 60

export class SeriesAdvanceRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'series_advance'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    const SUPABASE_URL              = globalThis.process?.env?.['SUPABASE_URL'] ?? ''
    const SUPABASE_SERVICE_ROLE_KEY = globalThis.process?.env?.['SUPABASE_SERVICE_ROLE_KEY'] ?? ''

    if (!SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('series_advance: SUPABASE_SERVICE_ROLE_KEY is required — this runner must execute in a server/worker context')
    }

    const startedAt = Date.now()
    const { nodeConfig, signal } = ctx
    const seriesId = (nodeConfig['seriesId'] as string | undefined) ?? (ctx.resolvedParams['seriesId'] as string | undefined)

    if (!seriesId) {
      return {
        output: {
          mediaType: 'text',
          text: '',
          data: { error: 'series_advance: seriesId is required in nodeConfig or upstream params', nodeId: ctx.nodeId },
          durationMs: 0,
        },
      }
    }

    if (signal?.aborted) {
      throw new Error('Execution aborted')
    }

    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/fn_advance_series`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey':        SUPABASE_SERVICE_ROLE_KEY,
      },
      body:   JSON.stringify({ p_series_id: seriesId }),
      signal,
    })

    if (!response.ok) {
      const body = await response.text().catch(() => response.statusText)

      if (body.includes('current_round_has_no_winner')) {
        return {
          output: {
            mediaType: 'text',
            text: '',
            data: {
              seriesId,
              retry: true,
              retryAfterSeconds: RETRY_AFTER_SECONDS,
              reason: 'current_round_unfinished',
              executedBy: 'series_advance_runner',
            },
            durationMs: Date.now() - startedAt,
          },
        }
      }

      throw new Error(`series_advance: fn_advance_series returned ${response.status}: ${body}`)
    }

    const payload = await response.json().catch(() => ({})) as Record<string, unknown>
    const updatedSeries = (Array.isArray(payload) ? payload[0] : payload) as Record<string, unknown>
    const seriesComplete = updatedSeries?.['status'] === 'complete'

    return {
      output: {
        mediaType: 'text',
        text: '',
        data: {
          seriesId,
          updatedSeries,
          seriesComplete,
          currentRound: updatedSeries?.['current_round'] as number | undefined,
          roundCount:   updatedSeries?.['round_count']  as number | undefined,
          executedBy: 'series_advance_runner',
        },
        durationMs: Date.now() - startedAt,
        metadata: {
          seriesId,
          seriesComplete,
          executedBy: 'series_advance_runner',
        },
      },
    }
  }
}
