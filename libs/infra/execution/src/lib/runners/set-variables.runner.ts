/**
 * SetVariablesRunner — assigns or overrides workflow-scoped variables.
 *
 * GRASP Information Expert: this runner knows how to read its config
 * (key-value pairs) and produce variableMutations that the engine merges
 * into the execution context's resolvedParams for all downstream nodes.
 *
 * Config schema (nodeConfig):
 *   variables: Record<string, string> — keys to set, values may reference
 *     upstream outputs via {{nodeId.field}} interpolation (handled by the
 *     engine's prompt resolver, NOT by this runner — single responsibility).
 *
 * Security: values are treated as opaque strings. No code execution.
 * The engine is responsible for sanitization at the boundary.
 */

import type { WorkflowNodeType } from '../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './node-runner.interface'

export class SetVariablesRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'set_variables'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    const variables = ctx.nodeConfig['variables'] as Record<string, unknown> | undefined

    if (!variables || typeof variables !== 'object') {
      return {
        output: {
          mediaType: 'text',
          text: 'No variables configured.',
          data: {},
          durationMs: 0,
        },
        variableMutations: {},
      }
    }

    // Resolve any dynamic references in values from upstream outputs
    const resolved: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(variables)) {
      if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
        // Upstream output reference: {{nodeId.field}} or {{nodeId}}
        const ref = value.slice(2, -2).trim()
        const [sourceNodeId, ...fieldParts] = ref.split('.')
        const upstream = ctx.upstreamOutputs.get(sourceNodeId)
        if (upstream) {
          if (fieldParts.length === 0) {
            resolved[key] = upstream.text ?? upstream.url ?? upstream.data
          } else {
            const field = fieldParts.join('.')
            resolved[key] = upstream.data?.[field] ?? upstream.metadata?.[field] ?? value
          }
        } else {
          // Keep original value if upstream not found (might be a root input reference)
          resolved[key] = ctx.resolvedParams[ref] ?? value
        }
      } else {
        resolved[key] = value
      }
    }

    return {
      output: {
        mediaType: 'text',
        text: `Set ${Object.keys(resolved).length} variable(s): ${Object.keys(resolved).join(', ')}`,
        data: resolved,
        durationMs: 0,
      },
      variableMutations: resolved,
    }
  }
}
