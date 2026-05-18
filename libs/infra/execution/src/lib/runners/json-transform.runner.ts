/**
 * JsonTransformRunner — applies JSONPath-style extraction on upstream output.
 *
 * GRASP Information Expert: this runner knows how to evaluate a transform
 * expression against incoming data and produce a derived result.
 *
 * Config schema (nodeConfig):
 *   expression: string — a dot-notation path (e.g. "items[0].name") or
 *     a simple field accessor. Does NOT execute arbitrary code.
 *   sourceNodeId?: string — which upstream node to pull data from.
 *     Defaults to the first upstream output if omitted.
 *
 * Security:
 * - No eval(), no Function(), no code execution.
 * - Only traverses object paths using a safe property accessor.
 * - Rejects paths containing prototype pollution attempts.
 */

import type { WorkflowNodeType } from '../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './node-runner.interface'

const FORBIDDEN_SEGMENTS = new Set(['__proto__', 'constructor', 'prototype'])

/**
 * Safely resolve a dot-notation path with optional array bracket indexing.
 * Returns undefined for invalid or forbidden paths.
 */
function resolvePath(obj: unknown, path: string): unknown {
  if (!path || typeof obj === 'undefined' || obj === null) return undefined

  // Parse path: "items[0].name" → ["items", "0", "name"]
  const segments = path
    .replace(/\[(\d+)]/g, '.$1')
    .split('.')
    .filter(Boolean)

  let current: unknown = obj
  for (const segment of segments) {
    if (FORBIDDEN_SEGMENTS.has(segment)) return undefined
    if (current === null || current === undefined) return undefined
    if (typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[segment]
  }
  return current
}

export class JsonTransformRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'json_transform'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    const expression = ctx.nodeConfig['expression'] as string | undefined
    const sourceNodeId = ctx.nodeConfig['sourceNodeId'] as string | undefined

    if (!expression || typeof expression !== 'string') {
      return {
        output: {
          mediaType: 'text',
          text: '',
          data: { error: 'No expression configured' },
          durationMs: 0,
        },
      }
    }

    // Determine source data
    let sourceData: unknown
    if (sourceNodeId) {
      const upstream = ctx.upstreamOutputs.get(sourceNodeId)
      sourceData = upstream?.data ?? (upstream?.text ? tryParseJson(upstream.text) : undefined)
    } else {
      // Use first upstream output
      const firstUpstream = ctx.upstreamOutputs.values().next().value
      if (firstUpstream) {
        sourceData = firstUpstream.data ?? (firstUpstream.text ? tryParseJson(firstUpstream.text) : undefined)
      }
    }

    if (sourceData === undefined || sourceData === null) {
      return {
        output: {
          mediaType: 'text',
          text: '',
          data: { error: 'No source data available', expression },
          durationMs: 0,
        },
      }
    }

    const result = resolvePath(sourceData, expression)
    const textOutput = typeof result === 'string' ? result : JSON.stringify(result ?? null)

    return {
      output: {
        mediaType: 'text',
        text: textOutput,
        data: { value: result, expression },
        durationMs: 0,
      },
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
