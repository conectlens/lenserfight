/**
 * RenameFieldRunner — remap top-level keys on upstream object(s).
 *
 * GRASP Information Expert: this runner relabels fields on a single object or
 * on every item of an array, leaving untouched keys in place.
 *
 * Config schema (nodeConfig):
 *   arrayPath?: string — dot-path to an array in upstream data. When set (or when
 *                        upstream data is already an array), each item is remapped.
 *   maxItems?: number — safety cap on items to remap (default: 1000)
 *   mappings: RenameMapping[] | Record<string, string>
 *            — { from, to } pairs (or a {from: to} map). Only top-level keys.
 *   dropUnmapped?: boolean — when true, keep only renamed keys (default: false)
 *
 * Collision policy: mappings apply against the ORIGINAL object snapshot, so a
 * later mapping can overwrite an earlier target deterministically (last wins).
 *
 * Security: no eval()/Function(); maxItems cap bounds array remapping.
 */

import type { WorkflowNodeType } from '../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './node-runner.interface'

const DEFAULT_MAX_ITEMS = 1000

export interface RenameMapping {
  from: string
  to: string
}

function normalizeMappings(raw: unknown): RenameMapping[] {
  if (Array.isArray(raw)) {
    return raw.filter(
      (m): m is RenameMapping =>
        !!m && typeof m === 'object' &&
        typeof (m as RenameMapping).from === 'string' &&
        typeof (m as RenameMapping).to === 'string',
    )
  }
  if (raw && typeof raw === 'object') {
    return Object.entries(raw as Record<string, unknown>)
      .filter(([, to]) => typeof to === 'string')
      .map(([from, to]) => ({ from, to: to as string }))
  }
  return []
}

function renameObject(
  obj: unknown,
  mappings: RenameMapping[],
  dropUnmapped: boolean,
): unknown {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj
  const source = obj as Record<string, unknown>
  const fromKeys = new Set(mappings.map((m) => m.from))

  const out: Record<string, unknown> = {}
  if (!dropUnmapped) {
    for (const [k, v] of Object.entries(source)) {
      if (!fromKeys.has(k)) out[k] = v
    }
  }
  // Apply against original snapshot; later mappings overwrite (last wins).
  for (const m of mappings) {
    if (m.from in source) out[m.to] = source[m.from]
  }
  return out
}

export class RenameFieldRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'rename_field'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    const arrayPath = ctx.nodeConfig['arrayPath'] as string | undefined
    const mappings = normalizeMappings(ctx.nodeConfig['mappings'])
    const dropUnmapped = ctx.nodeConfig['dropUnmapped'] === true
    const maxItems = Math.max(1, Math.min(
      Number(ctx.nodeConfig['maxItems'] ?? DEFAULT_MAX_ITEMS),
      DEFAULT_MAX_ITEMS,
    ))

    const firstUpstream = ctx.upstreamOutputs.values().next().value
    const sourceData = firstUpstream
      ? firstUpstream.data ?? (firstUpstream.text ? tryParseJson(firstUpstream.text) : undefined)
      : undefined

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
      const remapped = items.map((it) => renameObject(it, mappings, dropUnmapped))
      return {
        output: {
          mediaType: 'text',
          text: `Renamed fields on ${items.length} item(s)`,
          data: { items: remapped, count: remapped.length, truncated },
          durationMs: 0,
        },
      }
    }

    return {
      output: {
        mediaType: 'text',
        text: `Renamed ${mappings.length} field(s)`,
        data: { value: renameObject(sourceData, mappings, dropUnmapped) },
        durationMs: 0,
      },
    }
  }
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

function tryParseJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}
