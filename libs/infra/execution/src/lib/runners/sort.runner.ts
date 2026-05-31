/**
 * SortRunner — stable multi-field sort over an upstream array.
 *
 * GRASP Information Expert: this runner orders items by one or more keys,
 * each with its own direction, preserving input order on ties (stable).
 *
 * Config schema (nodeConfig):
 *   arrayPath?: string — dot-path to the array in upstream data
 *                        (defaults to root if upstream data is already an array)
 *   maxItems?: number — safety cap on items to sort (default: 1000)
 *   // Either a single key…
 *   field?: string — dot-path within each item to sort by
 *   direction?: 'asc' | 'desc' (default 'asc')
 *   // …or multiple keys (applied in order):
 *   sortBy?: SortKey[]
 *
 * Security:
 * - No eval()/Function(). Comparison uses number/string ordering only.
 * - maxItems cap bounds the O(n log n) sort cost.
 */

import type { WorkflowNodeType } from '../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './node-runner.interface'

const DEFAULT_MAX_ITEMS = 1000

export interface SortKey {
  field: string
  direction?: 'asc' | 'desc'
}

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

/** Compare two values. null/undefined sort last regardless of direction sign. */
function compareValues(a: unknown, b: unknown): number {
  const aNil = a === null || a === undefined
  const bNil = b === null || b === undefined
  if (aNil && bNil) return 0
  if (aNil) return 1
  if (bNil) return -1

  if (typeof a === 'number' && typeof b === 'number') {
    if (Number.isNaN(a) && Number.isNaN(b)) return 0
    if (Number.isNaN(a)) return 1
    if (Number.isNaN(b)) return -1
    return a < b ? -1 : a > b ? 1 : 0
  }

  // Numeric coercion when both look numeric
  const an = Number(a)
  const bn = Number(b)
  if (!Number.isNaN(an) && !Number.isNaN(bn) && a !== '' && b !== '') {
    return an < bn ? -1 : an > bn ? 1 : 0
  }

  const as = String(a)
  const bs = String(b)
  return as < bs ? -1 : as > bs ? 1 : 0
}

function resolveKeys(ctx: NodeRunnerContext): SortKey[] {
  const sortBy = ctx.nodeConfig['sortBy'] as SortKey[] | undefined
  if (Array.isArray(sortBy) && sortBy.length > 0) return sortBy
  const field = ctx.nodeConfig['field'] as string | undefined
  if (field) {
    return [{ field, direction: ctx.nodeConfig['direction'] as 'asc' | 'desc' | undefined }]
  }
  return []
}

function extractArray(sourceData: unknown, arrayPath: string | undefined): unknown[] {
  if (arrayPath) {
    const extracted = resolveDotPath(sourceData, arrayPath)
    return Array.isArray(extracted) ? extracted : []
  }
  return Array.isArray(sourceData) ? sourceData : []
}

export class SortRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'sort'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    const arrayPath = ctx.nodeConfig['arrayPath'] as string | undefined
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

    const keys = resolveKeys(ctx)

    let sorted: unknown[]
    if (keys.length === 0) {
      sorted = items
    } else {
      // Decorate with original index so ties preserve input order (stable).
      sorted = items
        .map((item, index) => ({ item, index }))
        .sort((a, b) => {
          for (const key of keys) {
            const dir = key.direction === 'desc' ? -1 : 1
            const cmp = compareValues(
              resolveDotPath(a.item, key.field),
              resolveDotPath(b.item, key.field),
            )
            if (cmp !== 0) return cmp * dir
          }
          return a.index - b.index
        })
        .map((decorated) => decorated.item)
    }

    return {
      output: {
        mediaType: 'text',
        text: `Sorted ${sorted.length} item(s)${truncated ? ` (capped from ${allItems.length})` : ''}`,
        data: {
          items: sorted,
          count: sorted.length,
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
