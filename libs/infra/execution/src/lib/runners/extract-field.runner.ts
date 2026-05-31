/**
 * ExtractFieldRunner — select/flatten field(s) from upstream data via dot-path.
 *
 * GRASP Information Expert: this runner projects a subset of fields out of an
 * object, or out of every item in an array.
 *
 * Config schema (nodeConfig):
 *   arrayPath?: string — dot-path to an array in upstream data. When set (or when
 *                        upstream data is already an array), each item is projected.
 *   maxItems?: number — safety cap on items to project (default: 1000)
 *   // Single field (flatten):
 *   field?: string — dot-path of the single value to extract
 *   // …or multiple fields (pick):
 *   fields?: Array<string | { path: string; as?: string }>
 *
 * When a single `field` is given the extracted value(s) are returned directly
 * (the `value` for an object, or `items` of flattened values for an array).
 * When `fields` are given, a projected object (or array of objects) is built;
 * the output key defaults to the path's last segment unless `as` is set.
 *
 * Security: no eval()/Function(); maxItems cap bounds array projection.
 */

import type { WorkflowNodeType } from '../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './node-runner.interface'

const DEFAULT_MAX_ITEMS = 1000

interface FieldSpec {
  path: string
  as?: string
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

function lastSegment(path: string): string {
  const segments = path.replace(/\[(\d+)]/g, '.$1').split('.').filter(Boolean)
  return segments.length > 0 ? segments[segments.length - 1] : path
}

function normalizeFields(raw: unknown): FieldSpec[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((entry) => {
      if (typeof entry === 'string') return { path: entry }
      if (entry && typeof entry === 'object' && typeof (entry as FieldSpec).path === 'string') {
        return { path: (entry as FieldSpec).path, as: (entry as FieldSpec).as }
      }
      return null
    })
    .filter((f): f is FieldSpec => f !== null)
}

function projectObject(obj: unknown, fields: FieldSpec[]): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const f of fields) {
    out[f.as || lastSegment(f.path)] = resolveDotPath(obj, f.path)
  }
  return out
}

export class ExtractFieldRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'extract_field'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    const arrayPath = ctx.nodeConfig['arrayPath'] as string | undefined
    const field = ctx.nodeConfig['field'] as string | undefined
    const fields = normalizeFields(ctx.nodeConfig['fields'])
    const maxItems = Math.max(1, Math.min(
      Number(ctx.nodeConfig['maxItems'] ?? DEFAULT_MAX_ITEMS),
      DEFAULT_MAX_ITEMS,
    ))

    const firstUpstream = ctx.upstreamOutputs.values().next().value
    const sourceData = firstUpstream
      ? firstUpstream.data ?? (firstUpstream.text ? tryParseJson(firstUpstream.text) : undefined)
      : undefined

    // Decide array-mode vs object-mode source.
    let arraySource: unknown[] | undefined
    if (arrayPath) {
      const extracted = resolveDotPath(sourceData, arrayPath)
      arraySource = Array.isArray(extracted) ? extracted : []
    } else if (Array.isArray(sourceData)) {
      arraySource = sourceData
    }

    if (arraySource) {
      const truncated = arraySource.length > maxItems
      const items = arraySource.slice(0, maxItems)
      const projected = fields.length > 0
        ? items.map((it) => projectObject(it, fields))
        : items.map((it) => (field ? resolveDotPath(it, field) : it))

      return {
        output: {
          mediaType: 'text',
          text: `Extracted from ${items.length} item(s)`,
          data: {
            items: projected,
            count: projected.length,
            truncated,
          },
          durationMs: 0,
        },
      }
    }

    // Object-mode projection.
    if (fields.length > 0) {
      return {
        output: {
          mediaType: 'text',
          text: `Extracted ${fields.length} field(s)`,
          data: projectObject(sourceData, fields),
          durationMs: 0,
        },
      }
    }

    const value = field ? resolveDotPath(sourceData, field) : sourceData
    return {
      output: {
        mediaType: 'text',
        text: field ? `Extracted "${field}"` : 'Extracted value',
        data: { value },
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
