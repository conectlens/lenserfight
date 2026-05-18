/**
 * SubWorkflowRunner — invoke a saved workflow as a reusable black-box.
 *
 * GRASP Indirection: this runner does NOT execute the sub-workflow itself.
 * Instead it validates the reference and prepares the delegation envelope.
 * The engine is responsible for actually dispatching the nested execution.
 *
 * Config schema (nodeConfig):
 *   workflowId: string — UUID of the workflow to invoke
 *   inputMapping?: Record<string, string> — maps sub-workflow root inputs to
 *     upstream output paths (e.g. { "query": "n1.text" })
 *   maxDepth?: number — max nesting depth (default: 3, max: 3)
 *
 * Security:
 * - Max nesting depth of 3 prevents infinite recursion.
 * - Sub-workflow inherits parent's budget constraint.
 * - workflowId must be a valid UUID format.
 */

import type { WorkflowNodeType } from '../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './node-runner.interface'

const MAX_NESTING_DEPTH = 3
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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

export class SubWorkflowRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'sub_workflow'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    const workflowId = ctx.nodeConfig['workflowId'] as string | undefined
    const inputMapping = ctx.nodeConfig['inputMapping'] as Record<string, string> | undefined
    const currentDepth = (ctx.resolvedParams['__sub_workflow_depth'] as number) ?? 0
    const maxDepth = Math.min(
      Number(ctx.nodeConfig['maxDepth'] ?? MAX_NESTING_DEPTH),
      MAX_NESTING_DEPTH,
    )

    // Validate workflow ID
    if (!workflowId || !UUID_REGEX.test(workflowId)) {
      return {
        output: {
          mediaType: 'text',
          text: '',
          data: { error: 'Invalid or missing workflowId' },
          durationMs: 0,
        },
      }
    }

    // Check nesting depth
    if (currentDepth >= maxDepth) {
      return {
        output: {
          mediaType: 'text',
          text: '',
          data: {
            error: `Maximum sub-workflow nesting depth (${maxDepth}) exceeded`,
            currentDepth,
          },
          durationMs: 0,
        },
      }
    }

    // Resolve input mapping from upstream outputs
    const resolvedInputs: Record<string, unknown> = {}
    if (inputMapping && typeof inputMapping === 'object') {
      for (const [targetKey, sourcePath] of Object.entries(inputMapping)) {
        // sourcePath format: "nodeId.field" or "nodeId"
        const [sourceNodeId, ...fieldParts] = sourcePath.split('.')
        const upstream = ctx.upstreamOutputs.get(sourceNodeId)
        if (upstream) {
          if (fieldParts.length === 0) {
            resolvedInputs[targetKey] = upstream.text ?? upstream.data ?? upstream.url
          } else {
            const dataSource = upstream.data ?? {}
            resolvedInputs[targetKey] = resolveDotPath(dataSource, fieldParts.join('.'))
          }
        } else {
          // Try resolvedParams as fallback
          resolvedInputs[targetKey] = ctx.resolvedParams[sourcePath] ?? null
        }
      }
    }

    // Emit delegation envelope — the engine picks this up and dispatches
    return {
      output: {
        mediaType: 'text',
        text: `Delegating to sub-workflow ${workflowId}`,
        data: {
          __sub_workflow_dispatch: true,
          workflowId,
          inputs: resolvedInputs,
          depth: currentDepth + 1,
        },
        durationMs: 0,
      },
      variableMutations: {
        __sub_workflow_depth: currentDepth + 1,
        __sub_workflow_id: workflowId,
      },
    }
  }
}
