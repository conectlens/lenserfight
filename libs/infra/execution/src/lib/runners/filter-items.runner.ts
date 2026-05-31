/**
 * FilterItemsRunner — keep array items that satisfy a predicate.
 *
 * GRASP Information Expert: this runner knows how to evaluate a whitelisted
 * predicate (single condition or an AND/OR group) against each upstream item.
 *
 * Config schema (nodeConfig):
 *   arrayPath?: string — dot-path to the array in upstream data
 *                        (defaults to root if upstream data is already an array)
 *   maxItems?: number — safety cap on items to evaluate (default: 1000)
 *   // Either a single condition…
 *   field?: string — dot-path within each item to compare
 *   operator?: FilterOperator
 *   value?: unknown
 *   // …or a boolean group:
 *   match?: 'and' | 'or' — combine `conditions` (default: 'and')
 *   conditions?: FilterCondition[]
 *
 * Security:
 * - No eval()/Function(). Operators are explicitly whitelisted.
 * - maxItems cap bounds CPU/memory for huge arrays.
 */

import type { WorkflowNodeType } from '../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './node-runner.interface'

const DEFAULT_MAX_ITEMS = 1000

export type FilterOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'contains'
  | 'in'
  | 'exists'

export interface FilterCondition {
  field: string
  operator: FilterOperator
  value?: unknown
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

function evaluateCondition(actual: unknown, operator: FilterOperator, expected: unknown): boolean {
  switch (operator) {
    case 'eq':
      return String(actual) === String(expected)
    case 'neq':
      return String(actual) !== String(expected)
    case 'gt':
      return Number(actual) > Number(expected)
    case 'gte':
      return Number(actual) >= Number(expected)
    case 'lt':
      return Number(actual) < Number(expected)
    case 'lte':
      return Number(actual) <= Number(expected)
    case 'contains':
      if (typeof actual === 'string') return actual.includes(String(expected))
      if (Array.isArray(actual)) return actual.some((el) => String(el) === String(expected))
      return false
    case 'in':
      return Array.isArray(expected) && expected.some((el) => String(el) === String(actual))
    case 'exists':
      return actual !== undefined && actual !== null
    default:
      return false
  }
}

function matchesItem(item: unknown, ctx: NodeRunnerContext): boolean {
  const conditions = ctx.nodeConfig['conditions'] as FilterCondition[] | undefined
  if (Array.isArray(conditions) && conditions.length > 0) {
    const match = (ctx.nodeConfig['match'] as string) === 'or' ? 'or' : 'and'
    const results = conditions.map((c) =>
      evaluateCondition(resolveDotPath(item, c.field), c.operator, c.value),
    )
    return match === 'or' ? results.some(Boolean) : results.every(Boolean)
  }

  // Single-condition form
  const field = ctx.nodeConfig['field'] as string | undefined
  const operator = ctx.nodeConfig['operator'] as FilterOperator | undefined
  if (!operator) return true // no predicate configured → pass-through
  const actual = field ? resolveDotPath(item, field) : item
  return evaluateCondition(actual, operator, ctx.nodeConfig['value'])
}

function extractArray(sourceData: unknown, arrayPath: string | undefined): unknown[] {
  if (arrayPath) {
    const extracted = resolveDotPath(sourceData, arrayPath)
    return Array.isArray(extracted) ? extracted : []
  }
  return Array.isArray(sourceData) ? sourceData : []
}

export class FilterItemsRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'filter_items'

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

    const filtered = items.filter((item) => matchesItem(item, ctx))

    return {
      output: {
        mediaType: 'text',
        text: `Filtered ${filtered.length}/${items.length} item(s)${truncated ? ` (capped from ${allItems.length})` : ''}`,
        data: {
          items: filtered,
          inputCount: items.length,
          outputCount: filtered.length,
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
