/**
 * ContenderRunRunner — executes a single AI contender's lens within a battle.
 *
 * GRASP Information Expert: owns the logic for running one contender slot.
 *
 * The WorkflowExecutionService resolves the lens template, renders [[label]]
 * placeholders, and validates inputs BEFORE calling this runner. The runner
 * receives the fully rendered prompt via `ctx.resolvedPrompt` and delegates
 * to the provider via `ctx.executeProvider`.
 *
 * Personality support:
 *   ctx.nodeConfig.personalityNote is appended to resolvedParams so the engine's
 *   closed-over provider function can apply it as a system prompt (the engine
 *   is the Information Expert for provider call construction).
 *
 * Battle metadata is attached to result.metadata for downstream nodes
 * (judge_battle, score_aggregator, etc.) to consume.
 */

import { inferAttachmentsFromRendered } from '../../execution-attachments'
import type { ExecutionInput, WorkflowNodeType } from '../../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from '../node-runner.interface'

export class ContenderRunRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'contender_run'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    const { resolvedPrompt, executeProvider, nodeConfig, resolvedParams, signal } = ctx

    const battleId    = nodeConfig['battleId']    as string | undefined
    const contenderId = nodeConfig['contenderId'] as string | undefined
    const slot        = nodeConfig['slot']        as 'A' | 'B' | undefined

    // Fallback for test environments or when provider wiring is absent.
    // Returns the resolved prompt as text so downstream nodes still receive data.
    if (!resolvedPrompt || !executeProvider) {
      return {
        output: {
          mediaType: 'text',
          text: resolvedPrompt ?? '',
          data: {
            nodeId:   ctx.nodeId,
            battleId,
            slot,
            fallback: true,
          },
          durationMs: 0,
        },
      }
    }

    // Cooperative cancellation check before the (potentially long) provider call.
    if (signal?.aborted) {
      throw new Error('Execution aborted')
    }

    // Merge personality note into params so the engine's provider closure can
    // apply it as a system message (engine is the Information Expert for that).
    const personalityNote = nodeConfig['personalityNote'] as string | undefined
    const mergedParams = personalityNote
      ? { ...resolvedParams, __system_prompt: personalityNote }
      : { ...resolvedParams }

    const attachments = inferAttachmentsFromRendered(mergedParams)
    const input: ExecutionInput = {
      prompt: resolvedPrompt,
      params: mergedParams,
      ...(attachments.length > 0 ? { attachments } : {}),
    }

    const result = await executeProvider(input)

    // Enrich metadata with battle execution context for downstream nodes
    result.metadata = {
      ...(result.metadata ?? {}),
      battleId,
      contenderId,
      slot,
      executedBy: 'contender_run_runner',
    }

    return { output: result }
  }
}
