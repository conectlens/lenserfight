/**
 * KVStoreReadRunner / KVStoreWriteRunner — workflow-scoped ephemeral KV state.
 *
 * Config schema:
 *   KVStoreReadRunner:
 *     key: string — key to read
 *   KVStoreWriteRunner:
 *     key: string — key to write
 *     value?: string — explicit value (defaults to upstream text)
 *     ttlMs?: number — TTL in ms (default: 86_400_000 = 24h)
 *
 * Security:
 * - Scoped to workflow run_id — cannot access other runs' data.
 * - Key length capped at 256 chars.
 * - Value size capped at 1MB.
 */

import type { WorkflowNodeType } from '../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './node-runner.interface'

const MAX_KEY_LENGTH = 256
const MAX_VALUE_SIZE = 1_048_576 // 1MB
const DEFAULT_TTL_MS = 86_400_000 // 24h

function validateKey(key: unknown): string | null {
  if (!key || typeof key !== 'string') return 'No key configured'
  if (key.length > MAX_KEY_LENGTH) return `Key exceeds max length of ${MAX_KEY_LENGTH}`
  if (/[^\w\-.]/.test(key)) return 'Key must contain only alphanumeric, dash, dot, underscore'
  return null
}

export class KVStoreReadRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'kv_store_read'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    const key = ctx.nodeConfig['key'] as string | undefined
    const keyError = validateKey(key)
    if (keyError) {
      return { output: { mediaType: 'text', text: '', data: { error: keyError }, durationMs: 0 } }
    }

    // Check workflow-scoped cache in resolvedParams
    const cachedValue = ctx.resolvedParams[`__kv_${key}`]
    if (cachedValue !== undefined) {
      const text = typeof cachedValue === 'string' ? cachedValue : JSON.stringify(cachedValue)
      return {
        output: { mediaType: 'text', text, data: { key, value: cachedValue, source: 'cache' }, durationMs: 0 },
      }
    }

    // Emit read request for engine
    return {
      output: {
        mediaType: 'text',
        text: `[KV Read: ${key}]`,
        data: { __kv_read_request: true, key },
        durationMs: 0,
      },
      variableMutations: { __kv_read_key: key },
    }
  }
}

export class KVStoreWriteRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'kv_store_write'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    const key = ctx.nodeConfig['key'] as string | undefined
    const keyError = validateKey(key)
    if (keyError) {
      return { output: { mediaType: 'text', text: '', data: { error: keyError }, durationMs: 0 } }
    }

    const ttlMs = Math.max(1000, Math.min(Number(ctx.nodeConfig['ttlMs'] ?? DEFAULT_TTL_MS), DEFAULT_TTL_MS))
    let value: unknown = ctx.nodeConfig['value']
    if (value === undefined || value === '') {
      const firstUpstream = ctx.upstreamOutputs.values().next().value
      value = firstUpstream?.text ?? firstUpstream?.data ?? null
    }

    if (value === null || value === undefined) {
      return { output: { mediaType: 'text', text: '', data: { error: 'No value to write', key }, durationMs: 0 } }
    }

    const serialized = typeof value === 'string' ? value : JSON.stringify(value)
    if (serialized.length > MAX_VALUE_SIZE) {
      return { output: { mediaType: 'text', text: '', data: { error: `Value exceeds max size of ${MAX_VALUE_SIZE} bytes`, key }, durationMs: 0 } }
    }

    return {
      output: {
        mediaType: 'text',
        text: `[KV Write: ${key} = ${serialized.slice(0, 50)}${serialized.length > 50 ? '...' : ''}]`,
        data: { __kv_write_request: true, key, valueLength: serialized.length, ttlMs },
        durationMs: 0,
      },
      variableMutations: { [`__kv_${key}`]: value, __kv_write_key: key },
    }
  }
}
