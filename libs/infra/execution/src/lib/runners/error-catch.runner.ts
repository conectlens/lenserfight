/**
 * ErrorCatchRunner — receives failure context from a failed upstream node.
 *
 * GRASP Information Expert: this runner knows how to extract error details
 * from the execution context and emit them as structured data for recovery
 * branches downstream.
 *
 * Config schema (nodeConfig):
 *   fallbackValue?: unknown — default value to emit when an error is caught
 *   continueOnError?: boolean — if true, marks the run as recovered (default: true)
 *
 * The engine wires this node as a special "error" edge from any node.
 * When the source node fails, the engine sends the error envelope to
 * this runner instead of propagating failure.
 *
 * Security: no code execution; purely data-passthrough.
 */

import type { WorkflowNodeType } from '../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './node-runner.interface'

export class ErrorCatchRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'error_catch'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    const fallbackValue = ctx.nodeConfig['fallbackValue']
    const continueOnError = ctx.nodeConfig['continueOnError'] !== false

    // Extract error info from upstream — the engine puts error data in
    // resolvedParams.__error_* when routing to an error_catch node.
    const errorNodeId = ctx.resolvedParams['__error_node_id'] as string | undefined
    const errorMessage = ctx.resolvedParams['__error_message'] as string | undefined
    const errorCode = ctx.resolvedParams['__error_code'] as string | undefined
    const retryCount = ctx.resolvedParams['__error_retry_count'] as number | undefined

    const errorData = {
      sourceNodeId: errorNodeId ?? null,
      error: errorMessage ?? 'Unknown error',
      errorCode: errorCode ?? 'unknown',
      retryCount: retryCount ?? 0,
      recovered: continueOnError,
    }

    return {
      output: {
        mediaType: 'text',
        text: fallbackValue !== undefined
          ? String(fallbackValue)
          : `Error caught from ${errorNodeId ?? 'unknown'}: ${errorMessage ?? 'Unknown error'}`,
        data: { ...errorData, fallbackValue: fallbackValue ?? null },
        durationMs: 0,
      },
      variableMutations: {
        __error_recovered: continueOnError,
        __error_source: errorNodeId ?? null,
      },
    }
  }
}
