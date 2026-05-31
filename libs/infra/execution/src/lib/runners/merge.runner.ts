/**
 * MergeRunner — fan-in: combine multiple upstream branch outputs into one.
 *
 * GRASP Information Expert: this runner knows how to read every upstream
 * output and aggregate them according to a configured mode.
 *
 * Config schema (nodeConfig):
 *   mode: 'append' | 'combine' | 'key_join' (default: 'append')
 *     - append:   concat all upstream array payloads into one array.
 *     - combine:  shallow-merge all upstream object payloads (later wins).
 *     - key_join: join the first two upstream array payloads on a matching
 *                 key, producing { ...left, ...right } rows.
 *   joinKey?: string — required for key_join; the field both sides share.
 *   maxItems?: number — safety cap on emitted rows (default: 1000).
 *
 * Security / scale:
 * - maxItems cap mirrors LoopMapRunner — prevents memory blow-up at 1M scale.
 * - key_join builds an index over the right side (O(n+m), not O(n*m)).
 * - No code execution.
 *
 * Handles 1..N inputs and missing branches: an upstream that produced no
 * usable payload contributes nothing rather than throwing.
 */

import type { ExecutionResult, WorkflowNodeType } from '../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './node-runner.interface'

const DEFAULT_MAX_ITEMS = 1000

export type MergeMode = 'append' | 'combine' | 'key_join'

/**
 * Resolve the merge-able payload for one upstream branch.
 *
 * Inter-node data travels as the envelope `output`/`text` string (JSON when
 * structured), so the parsed text wins. Falls back to the structured `data`
 * field for runner→runner handoffs that expose arrays/objects directly.
 */
function extractPayload(result: ExecutionResult): unknown {
  if (typeof result.text === 'string' && result.text.length > 0) {
    const parsed = tryParseJson(result.text)
    if (parsed !== undefined) return parsed
  }
  const data = result.data
  if (Array.isArray(data) || (data && typeof data === 'object')) return data
  return undefined
}

function toArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  if (value === null || value === undefined) return []
  return [value]
}

export class MergeRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'merge'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    const mode = (ctx.nodeConfig['mode'] as MergeMode) ?? 'append'
    const maxItems = Math.max(
      1,
      Math.min(Number(ctx.nodeConfig['maxItems'] ?? DEFAULT_MAX_ITEMS), DEFAULT_MAX_ITEMS),
    )

    const payloads: unknown[] = []
    for (const result of ctx.upstreamOutputs.values()) {
      const payload = extractPayload(result)
      if (payload !== undefined) payloads.push(payload)
    }

    if (mode === 'combine') {
      return this.combine(ctx.nodeId, payloads)
    }
    if (mode === 'key_join') {
      const joinKey = ctx.nodeConfig['joinKey'] as string | undefined
      return this.keyJoin(ctx.nodeId, payloads, joinKey, maxItems)
    }
    return this.append(ctx.nodeId, payloads, maxItems)
  }

  private append(nodeId: string, payloads: unknown[], maxItems: number): NodeRunnerResult {
    const combined: unknown[] = []
    for (const payload of payloads) {
      for (const item of toArray(payload)) {
        if (combined.length >= maxItems) break
        combined.push(item)
      }
      if (combined.length >= maxItems) break
    }
    const total = payloads.reduce<number>((sum, p) => sum + toArray(p).length, 0)
    return {
      output: {
        mediaType: 'text',
        text: `Merged ${combined.length} item(s) from ${payloads.length} branch(es)`,
        data: {
          nodeId,
          mode: 'append',
          items: combined,
          branchCount: payloads.length,
          totalCount: total,
          truncated: total > combined.length,
        },
        durationMs: 0,
      },
    }
  }

  private combine(nodeId: string, payloads: unknown[]): NodeRunnerResult {
    const merged: Record<string, unknown> = {}
    for (const payload of payloads) {
      if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
        Object.assign(merged, payload as Record<string, unknown>)
      }
    }
    return {
      output: {
        mediaType: 'text',
        text: `Merged ${payloads.length} branch(es) into ${Object.keys(merged).length} field(s)`,
        data: { nodeId, mode: 'combine', merged, branchCount: payloads.length },
        durationMs: 0,
      },
    }
  }

  private keyJoin(
    nodeId: string,
    payloads: unknown[],
    joinKey: string | undefined,
    maxItems: number,
  ): NodeRunnerResult {
    const left = toArray(payloads[0])
    const right = toArray(payloads[1])

    const rows: Record<string, unknown>[] = []
    if (joinKey && (left.length > 0 || right.length > 0)) {
      // Index the right side once (O(m)) so the join is O(n+m), not O(n*m).
      const rightIndex = new Map<string, Record<string, unknown>>()
      for (const row of right) {
        if (row && typeof row === 'object' && !Array.isArray(row)) {
          const key = (row as Record<string, unknown>)[joinKey]
          if (key !== undefined && key !== null) rightIndex.set(String(key), row as Record<string, unknown>)
        }
      }
      for (const row of left) {
        if (rows.length >= maxItems) break
        if (!row || typeof row !== 'object' || Array.isArray(row)) continue
        const key = (row as Record<string, unknown>)[joinKey]
        if (key === undefined || key === null) continue
        const match = rightIndex.get(String(key))
        if (match) rows.push({ ...(row as Record<string, unknown>), ...match })
      }
    }

    return {
      output: {
        mediaType: 'text',
        text: `Key-join on "${joinKey ?? ''}" produced ${rows.length} row(s)`,
        data: {
          nodeId,
          mode: 'key_join',
          joinKey: joinKey ?? null,
          items: rows,
          leftCount: left.length,
          rightCount: right.length,
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
