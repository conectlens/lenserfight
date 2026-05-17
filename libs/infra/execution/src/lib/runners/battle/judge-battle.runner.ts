/**
 * JudgeBattleRunner — HTTP delegation to the ai-judge-battle edge function.
 *
 * GRASP Indirection: shields the DAG engine from the judging implementation
 * details. The edge function owns all rubric evaluation logic; this runner
 * only fires-and-checks the HTTP boundary.
 *
 * Config schema (nodeConfig):
 *   battleId: string — the battle to judge
 *
 * On non-200 the runner throws — the engine's retry mechanism handles
 * transient failures (rate limits, cold-start timeouts).
 */

import type { WorkflowNodeType } from '../../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from '../node-runner.interface'

export class JudgeBattleRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'judge_battle'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    const SUPABASE_URL              = globalThis.process?.env?.['SUPABASE_URL'] ?? ''
    const SUPABASE_SERVICE_ROLE_KEY = globalThis.process?.env?.['SUPABASE_SERVICE_ROLE_KEY'] ?? ''

    if (!SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('judge_battle: SUPABASE_SERVICE_ROLE_KEY is required — this runner must execute in a server/worker context')
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
            error:  'judge_battle: battleId is required in nodeConfig',
            nodeId: ctx.nodeId,
          },
          durationMs: 0,
        },
      }
    }

    if (signal?.aborted) {
      throw new Error('Execution aborted')
    }

    const url = `${SUPABASE_URL}/functions/v1/ai-judge-battle`

    const response = await fetch(url, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body:   JSON.stringify({ battle_id: battleId }),
      signal: signal,
    })

    if (!response.ok) {
      const body = await response.text().catch(() => response.statusText)
      throw new Error(`judge_battle: edge function returned ${response.status}: ${body}`)
    }

    const payload = await response.json().catch(() => ({})) as Record<string, unknown>

    return {
      output: {
        mediaType: 'text',
        text:      '',
        data: {
          battleId,
          judged:     true,
          edgeResult: payload,
          executedBy: 'judge_battle_runner',
        },
        durationMs: Date.now() - startedAt,
        metadata: {
          battleId,
          executedBy: 'judge_battle_runner',
        },
      },
    }
  }
}
