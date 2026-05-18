/**
 * LoopMapRunner — fan-out: iterate over array input, emit per-item results.
 *
 * GRASP Information Expert: this runner knows how to split array input into
 * individual items and produce a result array that downstream merge nodes
 * can aggregate.
 *
 * Config schema (nodeConfig):
 *   arrayPath?: string — dot-path to the array field in upstream data
 *                        (defaults to root if upstream data is already an array)
 *   itemVariable?: string — name of the variable holding the current item
 *                           (defaults to "item")
 *   maxItems?: number — safety cap on items to iterate (default: 1000)
 *
 * This runner does NOT spawn sub-executions itself (that's the engine's job).
 * Instead it:
 * 1. Extracts the array from upstream.
 * 2. Emits each item as a separate entry in output.data.items[].
 * 3. Sets variableMutations with the iteration metadata for the engine
 *    to use when dispatching child nodes.
 *
 * Security:
 * - maxItems cap prevents memory exhaustion from huge arrays.
 * - No code execution.
 */

import type { WorkflowNodeType } from '../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './node-runner.interface'

const DEFAULT_MAX_ITEMS = 1000

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

export class LoopMapRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'loop_map'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    const arrayPath = ctx.nodeConfig['arrayPath'] as string | undefined
    const itemVariable = (ctx.nodeConfig['itemVariable'] as string) || 'item'
    const maxItems = Math.max(1, Math.min(
      Number(ctx.nodeConfig['maxItems'] ?? DEFAULT_MAX_ITEMS),
      DEFAULT_MAX_ITEMS,
    ))

    // Get source data from first upstream
    const firstUpstream = ctx.upstreamOutputs.values().next().value
    let sourceData: unknown
    if (firstUpstream) {
      sourceData = firstUpstream.data ?? (firstUpstream.text ? tryParseJson(firstUpstream.text) : undefined)
    }

    // Extract array
    let items: unknown[]
    if (arrayPath) {
      const extracted = resolveDotPath(sourceData, arrayPath)
      items = Array.isArray(extracted) ? extracted : []
    } else if (Array.isArray(sourceData)) {
      items = sourceData
    } else {
      items = []
    }

    // Cap items
    const truncated = items.length > maxItems
    const processedItems = items.slice(0, maxItems)

    return {
      output: {
        mediaType: 'text',
        text: `Loop: ${processedItems.length} item(s)${truncated ? ` (truncated from ${items.length})` : ''}`,
        data: {
          items: processedItems,
          totalCount: items.length,
          processedCount: processedItems.length,
          truncated,
          itemVariable,
        },
        durationMs: 0,
      },
      variableMutations: {
        __loop_items: processedItems,
        __loop_item_variable: itemVariable,
        __loop_total: items.length,
        __loop_processed: processedItems.length,
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
