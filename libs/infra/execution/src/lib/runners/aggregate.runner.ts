/**
 * AggregateRunner — group-by + reduce over an upstream array.
 *
 * GRASP Information Expert: this runner buckets items by an optional group key
 * and computes a whitelisted aggregate per bucket.
 *
 * Config schema (nodeConfig):
 *   arrayPath?: string — dot-path to the array in upstream data
 *                        (defaults to root if upstream data is already an array)
 *   maxItems?: number — safety cap on items to scan (default: 1000)
 *   groupBy?: string — dot-path used to bucket items (omit for a single bucket)
 *   operation: AggregateOperation — count | sum | avg | min | max | unique | first | last
 *   field?: string — dot-path to the value operated on (required for
 *                    sum/avg/min/max/unique; ignored for count)
 *
 * Output:
 *   data.groups: Array<{ key, value, count }> when groupBy is set
 *   data.value: aggregate over all items when groupBy is absent
 *
 * Security:
 * - No eval()/Function(). Operation set is whitelisted.
 * - maxItems cap bounds the single linear scan.
 */

import type { WorkflowNodeType } from '../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './node-runner.interface'

const DEFAULT_MAX_ITEMS = 1000

export type AggregateOperation =
  | 'count'
  | 'sum'
  | 'avg'
  | 'min'
  | 'max'
  | 'unique'
  | 'first'
  | 'last'

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

function aggregate(items: unknown[], operation: AggregateOperation, field: string | undefined): unknown {
  if (operation === 'count') return items.length

  const values = field ? items.map((it) => resolveDotPath(it, field)) : items

  switch (operation) {
    case 'first':
      return values.length > 0 ? values[0] : null
    case 'last':
      return values.length > 0 ? values[values.length - 1] : null
    case 'unique': {
      const seen = new Set<string>()
      const out: unknown[] = []
      for (const v of values) {
        const key = typeof v === 'object' ? JSON.stringify(v) : String(v)
        if (!seen.has(key)) {
          seen.add(key)
          out.push(v)
        }
      }
      return out
    }
    case 'sum':
    case 'avg': {
      const nums = values.map(Number).filter((n) => !Number.isNaN(n))
      const total = nums.reduce((acc, n) => acc + n, 0)
      if (operation === 'sum') return total
      return nums.length > 0 ? total / nums.length : 0
    }
    case 'min':
    case 'max': {
      const nums = values.map(Number).filter((n) => !Number.isNaN(n))
      if (nums.length === 0) return null
      return operation === 'min' ? Math.min(...nums) : Math.max(...nums)
    }
    default:
      return null
  }
}

function extractArray(sourceData: unknown, arrayPath: string | undefined): unknown[] {
  if (arrayPath) {
    const extracted = resolveDotPath(sourceData, arrayPath)
    return Array.isArray(extracted) ? extracted : []
  }
  return Array.isArray(sourceData) ? sourceData : []
}

export class AggregateRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'aggregate'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    const arrayPath = ctx.nodeConfig['arrayPath'] as string | undefined
    const groupBy = ctx.nodeConfig['groupBy'] as string | undefined
    const operation = (ctx.nodeConfig['operation'] as AggregateOperation) || 'count'
    const field = ctx.nodeConfig['field'] as string | undefined
    const maxItems = Math.max(1, Math.min(
      Number(ctx.nodeConfig['maxItems'] ?? DEFAULT_MAX_ITEMS),
      DEFAULT_MAX_ITEMS,
    ))

    const firstUpstream = ctx.upstreamOutputs.values().next().value
    const sourceData = firstUpstream
      ? firstUpstream.data ?? (firstUpstream.text ? tryParseJson(firstUpstream.text) : undefined)
      : undefined

    const allItems = extractArray(sourceData, arrayPath)
    const truncated = allItems.length > maxItems
    const items = allItems.slice(0, maxItems)

    if (!groupBy) {
      return {
        output: {
          mediaType: 'text',
          text: `Aggregated ${items.length} item(s) → ${operation}`,
          data: {
            value: aggregate(items, operation, field),
            operation,
            inputCount: items.length,
            truncated,
          },
          durationMs: 0,
        },
      }
    }

    // Bucket preserving first-seen key order.
    const buckets = new Map<string, unknown[]>()
    for (const item of items) {
      const rawKey = resolveDotPath(item, groupBy)
      const key = typeof rawKey === 'object' && rawKey !== null ? JSON.stringify(rawKey) : String(rawKey)
      const bucket = buckets.get(key)
      if (bucket) bucket.push(item)
      else buckets.set(key, [item])
    }

    const groups = Array.from(buckets.entries()).map(([key, bucketItems]) => ({
      key,
      value: aggregate(bucketItems, operation, field),
      count: bucketItems.length,
    }))

    return {
      output: {
        mediaType: 'text',
        text: `Aggregated ${items.length} item(s) into ${groups.length} group(s) → ${operation}`,
        data: {
          groups,
          operation,
          groupBy,
          inputCount: items.length,
          truncated,
        },
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
