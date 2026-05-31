/**
 * AgentExecuteRunner — trigger an autonomous agent team run and poll for completion.
 *
 * Config schema (nodeConfig):
 *   agentId: string — agent to execute (required)
 *   taskPrompt: string — task description passed to the agent (required)
 *   maxSteps?: number — max reasoning steps (default: 10)
 *   timeoutMs?: number — polling deadline in ms (default: 120000)
 *
 * Credentials: supabaseUrl and supabaseServiceRoleKey must be present in
 * ctx.resolvedParams (populated by the engine for server-side runs).
 *
 * Polling: checks status every 2 s, stops on completed/failed/cancelled or timeout.
 * On timeout throws — the engine can wire this into a TryCatchRunner.
 */

import type { WorkflowNodeType } from '../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './node-runner.interface'

const POLL_INTERVAL_MS = 2_000
const MAX_POLL_ITERATIONS = 60
const TERMINAL_STATUSES = new Set(['completed', 'failed', 'cancelled'])

export class AgentExecuteRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'agent_execute'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    const start = performance.now()

    const agentId = ctx.nodeConfig['agentId'] as string | undefined
    if (!agentId) throw new Error('AgentExecuteRunner: nodeConfig.agentId is required')

    const taskPrompt = ctx.nodeConfig['taskPrompt'] as string | undefined
    if (!taskPrompt) throw new Error('AgentExecuteRunner: nodeConfig.taskPrompt is required')

    const maxSteps = Math.max(1, Number(ctx.nodeConfig['maxSteps'] ?? 10))
    const timeoutMs = Math.max(1000, Number(ctx.nodeConfig['timeoutMs'] ?? 120_000))

    const supabaseUrl = ctx.resolvedParams['supabaseUrl'] as string | undefined
    const supabaseServiceRoleKey = ctx.resolvedParams['supabaseServiceRoleKey'] as string | undefined

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Supabase service role credentials not available in context')
    }

    const serviceHeaders = {
      'apikey': supabaseServiceRoleKey,
      'Authorization': `Bearer ${supabaseServiceRoleKey}`,
      'Content-Type': 'application/json',
    }

    // Step 1: create the team run
    const createRes = await fetch(`${supabaseUrl}/rest/v1/rpc/fn_create_team_run`, {
      method: 'POST',
      headers: serviceHeaders,
      body: JSON.stringify({ p_agent_id: agentId, p_task_prompt: taskPrompt, p_max_steps: maxSteps }),
    })

    if (!createRes.ok) {
      const body = await createRes.text()
      throw new Error(`AgentExecuteRunner: fn_create_team_run failed (${createRes.status}): ${body}`)
    }

    const createData = (await createRes.json()) as Record<string, unknown>
    const runId = createData['id'] ?? createData['run_id'] ?? createData
    if (!runId) throw new Error('AgentExecuteRunner: fn_create_team_run returned no run id')

    // Step 2: poll status until terminal or timeout
    let iterations = 0
    let statusData: Record<string, unknown> = {}

    while (iterations < MAX_POLL_ITERATIONS) {
      const elapsed = performance.now() - start
      if (elapsed >= timeoutMs) {
        throw new Error(`agent-execute timeout after ${timeoutMs}ms`)
      }

      await delay(POLL_INTERVAL_MS)
      iterations++

      const statusRes = await fetch(
        `${supabaseUrl}/rest/v1/rpc/fn_get_team_run_status?p_run_id=${encodeURIComponent(String(runId))}`,
        { method: 'GET', headers: serviceHeaders },
      )

      if (!statusRes.ok) continue

      statusData = (await statusRes.json()) as Record<string, unknown>
      const status = statusData['status'] as string | undefined

      if (status && TERMINAL_STATUSES.has(status)) break
    }

    const elapsed = Math.round(performance.now() - start)
    if (elapsed >= timeoutMs) {
      throw new Error(`agent-execute timeout after ${timeoutMs}ms`)
    }

    const status = (statusData['status'] as string | undefined) ?? 'unknown'

    return {
      output: {
        mediaType: 'text',
        text: status,
        data: {
          result: statusData['result'] ?? null,
          steps: statusData['steps'] ?? null,
          status,
          runId: String(runId),
        },
        durationMs: elapsed,
      },
    }
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
