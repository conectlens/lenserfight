/**
 * DeduplicateRunner — drop duplicate array items by key(s) or whole-item.
 *
 * GRASP Information Expert: this runner collapses items sharing the same dedupe
 * signature, keeping either the first or last occurrence.
 *
 * Config schema (nodeConfig):
 *   arrayPath?: string — dot-path to the array in upstream data
 *                        (defaults to root if upstream data is already an array)
 *   maxItems?: number — safety cap on items to scan (default: 1000)
 *   keys?: string[] | string — dot-path(s) forming the dedupe signature.
 *                              Omit to dedupe by the whole item (JSON identity).
 *   keep?: 'first' | 'last' — which duplicate to retain (default: 'first')
 *
 * Security: no eval()/Function(); maxItems cap bounds the single linear scan.
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

function normalizeKeys(raw: unknown): string[] {
  if (typeof raw === 'string' && raw) return [raw]
  if (Array.isArray(raw)) return raw.filter((k): k is string => typeof k === 'string')
  return []
}

function signatureOf(item: unknown, keys: string[]): string {
  if (keys.length === 0) {
    return typeof item === 'object' && item !== null ? JSON.stringify(item) : `p:${String(item)}`
  }
  return JSON.stringify(keys.map((k) => resolveDotPath(item, k)))
}

function extractArray(sourceData: unknown, arrayPath: string | undefined): unknown[] {
  if (arrayPath) {
    const extracted = resolveDotPath(sourceData, arrayPath)
    return Array.isArray(extracted) ? extracted : []
  }
  return Array.isArray(sourceData) ? sourceData : []
}

export class DeduplicateRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'deduplicate'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    const arrayPath = ctx.nodeConfig['arrayPath'] as string | undefined
    const keys = normalizeKeys(ctx.nodeConfig['keys'])
    const keep = (ctx.nodeConfig['keep'] as string) === 'last' ? 'last' : 'first'
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

    let deduped: unknown[]
    if (keep === 'first') {
      const seen = new Set<string>()
      deduped = []
      for (const item of items) {
        const sig = signatureOf(item, keys)
        if (!seen.has(sig)) {
          seen.add(sig)
          deduped.push(item)
        }
      }
    } else {
      // keep last → retain last occurrence but preserve first-seen ordering.
      const order: string[] = []
      const byKey = new Map<string, unknown>()
      for (const item of items) {
        const sig = signatureOf(item, keys)
        if (!byKey.has(sig)) order.push(sig)
        byKey.set(sig, item)
      }
      deduped = order.map((sig) => byKey.get(sig))
    }

    return {
      output: {
        mediaType: 'text',
        text: `Deduplicated ${items.length} → ${deduped.length} item(s) (keep ${keep})`,
        data: {
          items: deduped,
          inputCount: items.length,
          outputCount: deduped.length,
          removed: items.length - deduped.length,
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
