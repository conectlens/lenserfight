/**
 * MemoryReadRunner / MemoryWriteRunner — explicit lenser memory management.
 *
 * GRASP Information Expert: each runner knows how to structure a memory
 * read or write request for the engine to dispatch to the Supabase RPCs.
 *
 * MemoryReadRunner config:
 *   key: string — memory key to read
 *   lenserId?: string — lenser scope (defaults to run owner)
 *
 * MemoryWriteRunner config:
 *   key: string — memory key to write
 *   value?: string — explicit value (defaults to upstream text)
 *   lenserId?: string — lenser scope
 *
 * Security: no code execution. Memory operations are scoped to the
 * authenticated lenser via RLS on the Supabase side.
 */

import type { WorkflowNodeType } from '../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './node-runner.interface'

export class MemoryReadRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'memory_read'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    const key = ctx.nodeConfig['key'] as string | undefined
    const lenserId = ctx.nodeConfig['lenserId'] as string | undefined

    if (!key || typeof key !== 'string') {
      return {
        output: {
          mediaType: 'text',
          text: '',
          data: { error: 'No memory key configured' },
          durationMs: 0,
        },
      }
    }

    // Check if the key exists in resolvedParams (engine may pre-populate)
    const cachedValue = ctx.resolvedParams[`__memory_${key}`]
    if (cachedValue !== undefined) {
      const text = typeof cachedValue === 'string' ? cachedValue : JSON.stringify(cachedValue)
      return {
        output: {
          mediaType: 'text',
          text,
          data: { key, value: cachedValue, source: 'cache' },
          durationMs: 0,
        },
      }
    }

    // Emit read request envelope for the engine
    return {
      output: {
        mediaType: 'text',
        text: `[Memory Read: ${key}]`,
        data: {
          __memory_read_request: true,
          key,
          lenserId: lenserId ?? null,
        },
        durationMs: 0,
      },
      variableMutations: {
        __memory_read_key: key,
      },
    }
  }
}

export class MemoryWriteRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'memory_write'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    const key = ctx.nodeConfig['key'] as string | undefined
    const explicitValue = ctx.nodeConfig['value'] as string | undefined
    const lenserId = ctx.nodeConfig['lenserId'] as string | undefined

    if (!key || typeof key !== 'string') {
      return {
        output: {
          mediaType: 'text',
          text: '',
          data: { error: 'No memory key configured' },
          durationMs: 0,
        },
      }
    }

    // Determine value to write
    let value: unknown = explicitValue
    if (value === undefined) {
      const firstUpstream = ctx.upstreamOutputs.values().next().value
      value = firstUpstream?.text ?? firstUpstream?.data ?? null
    }

    if (value === null || value === undefined) {
      return {
        output: {
          mediaType: 'text',
          text: '',
          data: { error: 'No value to write', key },
          durationMs: 0,
        },
      }
    }

    const textValue = typeof value === 'string' ? value : JSON.stringify(value)

    return {
      output: {
        mediaType: 'text',
        text: `[Memory Write: ${key} = ${textValue.slice(0, 100)}${textValue.length > 100 ? '...' : ''}]`,
        data: {
          __memory_write_request: true,
          key,
          value,
          valueLength: textValue.length,
          lenserId: lenserId ?? null,
        },
        durationMs: 0,
      },
      variableMutations: {
        [`__memory_${key}`]: value,
        __memory_write_key: key,
      },
    }
  }
}
