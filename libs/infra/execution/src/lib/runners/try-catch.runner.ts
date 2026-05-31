/**
 * TryCatchRunner — error recovery gate in a DAG.
 *
 * When an upstream node fails, the engine sets `resolvedParams.__upstream_error`
 * to the error message before routing to this node. This runner detects that
 * signal and emits a 'caught' envelope so downstream error-handling nodes can
 * branch accordingly. When no error is present it passes upstream data through.
 *
 * Config schema (nodeConfig):
 *   errorOutputKey?: string — key under which the caught error is exposed in
 *     output.data (default: 'error')
 *
 * Routing: wire a downstream if_condition or switch node against output.data.caught
 * to direct the happy-path vs. error-path branches.
 */

import type { WorkflowNodeType } from '../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './node-runner.interface'

export class TryCatchRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'try_catch'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    const errorOutputKey = (ctx.nodeConfig['errorOutputKey'] as string | undefined) ?? 'error'
    const upstreamError = ctx.resolvedParams['__upstream_error']

    if (upstreamError !== undefined && upstreamError !== null) {
      return {
        output: {
          mediaType: 'text',
          text: 'caught',
          data: { caught: true, [errorOutputKey]: upstreamError },
          durationMs: 0,
        },
        variableMutations: { __error_caught: true },
      }
    }

    // No upstream error — pass through the first upstream output
    const firstUpstream = ctx.upstreamOutputs.values().next().value
    const passData: Record<string, unknown> = firstUpstream?.data
      ? { ...firstUpstream.data }
      : {}
    if (firstUpstream?.text !== undefined) {
      passData['text'] = firstUpstream.text
    }

    return {
      output: {
        mediaType: 'text',
        text: 'pass-through',
        data: { caught: false, ...passData },
        durationMs: 0,
      },
      variableMutations: {},
    }
  }
}
