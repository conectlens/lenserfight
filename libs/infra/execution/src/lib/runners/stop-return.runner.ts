/**
 * StopReturnRunner — early-termination node.
 *
 * GRASP Information Expert: this runner knows how to resolve the run's final
 * return value and raise the halt signal the engine honors.
 *
 * Config schema (nodeConfig):
 *   returnValue?: unknown — literal value to surface as the run output.
 *   returnPath?: string — dot-path into the first upstream payload; takes
 *                         precedence over returnValue when both are present.
 *
 * Halting:
 * - variableMutations.__workflow_halt = true is merged into rootInputs. After
 *   each wave the engine checks this flag; when set it marks every remaining
 *   non-terminal node `skipped` and stops scheduling, so the run finishes
 *   `completed` with this node's output as the terminal result.
 *
 * Security: no code execution; returnPath is a bounded dot-path lookup.
 */

import type { WorkflowNodeType } from '../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './node-runner.interface'

/** Variable mutation key the engine checks after each wave to halt scheduling. */
export const WORKFLOW_HALT_KEY = '__workflow_halt'

function resolveDotPath(obj: unknown, path: string): unknown {
  if (!path) return obj
  const segments = path.replace(/\[(\d+)]/g, '.$1').split('.').filter(Boolean)
  let current: unknown = obj
  for (const seg of segments) {
    if (current === null || current === undefined || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[seg]
  }
  return current
}

export class StopReturnRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'stop_return'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    const returnPath = ctx.nodeConfig['returnPath'] as string | undefined
    let returnValue = ctx.nodeConfig['returnValue']

    if (returnPath) {
      const firstUpstream = ctx.upstreamOutputs.values().next().value
      if (firstUpstream) {
        const source =
          firstUpstream.data ??
          (firstUpstream.text ? tryParseJson(firstUpstream.text) ?? firstUpstream.text : undefined)
        returnValue = resolveDotPath(source, returnPath)
      }
    }

    const text =
      typeof returnValue === 'string'
        ? returnValue
        : returnValue === undefined
          ? 'Workflow stopped.'
          : JSON.stringify(returnValue)

    return {
      output: {
        mediaType: 'text',
        text,
        data: { nodeId: ctx.nodeId, halted: true, returnValue: returnValue ?? null },
        durationMs: 0,
      },
      variableMutations: { [WORKFLOW_HALT_KEY]: true },
    }
  }
}

function tryParseJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}
