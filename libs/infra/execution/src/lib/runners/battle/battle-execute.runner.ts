/**
 * BattleExecuteRunner — DAG controller for workflow-composed battles.
 *
 * GRASP Controller: coordinates the battle execution lifecycle within a
 * workflow graph. It does NOT directly execute contenders (that is
 * ContenderRunRunner's responsibility) — instead it validates the battle
 * configuration and forwards the battleId for downstream nodes.
 *
 * Architecture note:
 *   In the DAG model, the actual contender execution is performed by sibling
 *   `contender_run` nodes that run in parallel (or sequence) within the same
 *   workflow. The `battle_execute` node acts as a gate/coordinator:
 *     1. Validates required config is present.
 *     2. Reads contender configs from nodeConfig or upstream resolvedParams.
 *     3. Returns a structured context payload for downstream nodes
 *        (judge_battle, vote_collector, score_aggregator).
 *
 *   The battle status transitions (executing → voting → scoring → closed) are
 *   owned by the DB RPCs and the battle-worker, not by this runner.
 *
 * Config schema (nodeConfig):
 *   battleId:     string  — the battle to orchestrate
 *   slot:         'A'|'B' — (optional) specific slot this node targets
 *   taskPrompt:   string  — (optional) override task prompt for both slots
 */

import type { WorkflowNodeType } from '../../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from '../node-runner.interface'

export class BattleExecuteRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'battle_execute'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    const startedAt = Date.now()
    const { nodeConfig, signal } = ctx

    const battleId    = nodeConfig['battleId']    as string | undefined
    const taskPrompt  = nodeConfig['taskPrompt']  as string | undefined

    if (!battleId) {
      return {
        output: {
          mediaType: 'text',
          text: '',
          data: {
            error:    'battle_execute: battleId is required in nodeConfig',
            nodeId:   ctx.nodeId,
          },
          durationMs: 0,
        },
      }
    }

    if (signal?.aborted) {
      throw new Error('Execution aborted')
    }

    // Collect contender outputs from upstream `contender_run` nodes.
    // The DAG engine routes upstream results into ctx.upstreamOutputs keyed
    // by source nodeId. We gather any output that has slot metadata.
    const contenderResults: Record<string, unknown> = {}
    for (const [nodeId, output] of ctx.upstreamOutputs.entries()) {
      const slot = output.metadata?.['slot'] as string | undefined
      if (slot) {
        contenderResults[`slot_${slot}`] = {
          nodeId,
          text:  output.text,
          url:   output.url,
          metadata: output.metadata,
        }
      }
    }

    return {
      output: {
        mediaType: 'text',
        text:      taskPrompt ?? '',
        data: {
          battleId,
          contenderResults,
          executionMode:   'dag_orchestrated',
          upstreamCount:   ctx.upstreamOutputs.size,
          executedBy:      'battle_execute_runner',
        },
        durationMs: Date.now() - startedAt,
        metadata: {
          battleId,
          executedBy: 'battle_execute_runner',
        },
      },
    }
  }
}
