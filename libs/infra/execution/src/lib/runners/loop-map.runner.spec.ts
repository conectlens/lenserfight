import { describe, it, expect } from 'vitest'
import { LoopMapRunner } from './loop-map.runner'
import type { NodeRunnerContext } from './node-runner.interface'
import type { ExecutionResult } from '../execution.types'

describe('LoopMapRunner', () => {
  const runner = new LoopMapRunner()

  it('declares node type as loop_map', () => {
    expect(runner.nodeType).toBe('loop_map')
  })

  it('returns empty items when no upstream data', async () => {
    const ctx: NodeRunnerContext = {
      nodeId: 'loop1',
      upstreamOutputs: new Map(),
      resolvedParams: {},
      nodeConfig: {},
    }

    const result = await runner.execute(ctx)
    expect(result.output.data?.['items']).toEqual([])
    expect(result.output.data?.['processedCount']).toBe(0)
  })

  it('iterates over array in upstream data', async () => {
    const upstream: ExecutionResult = {
      mediaType: 'text',
      text: '',
      data: { users: ['Alice', 'Bob', 'Charlie'] },
      durationMs: 0,
    }
    const ctx: NodeRunnerContext = {
      nodeId: 'loop1',
      upstreamOutputs: new Map([['n1', upstream]]),
      resolvedParams: {},
      nodeConfig: { arrayPath: 'users' },
    }

    const result = await runner.execute(ctx)
    expect(result.output.data?.['items']).toEqual(['Alice', 'Bob', 'Charlie'])
    expect(result.output.data?.['processedCount']).toBe(3)
    expect(result.output.data?.['totalCount']).toBe(3)
  })

  it('handles root-level array in upstream data', async () => {
    const upstream: ExecutionResult = {
      mediaType: 'text',
      text: '',
      data: [1, 2, 3] as unknown as Record<string, unknown>,
      durationMs: 0,
    }
    const ctx: NodeRunnerContext = {
      nodeId: 'loop1',
      upstreamOutputs: new Map([['n1', upstream]]),
      resolvedParams: {},
      nodeConfig: {},
    }

    const result = await runner.execute(ctx)
    expect(result.output.data?.['items']).toEqual([1, 2, 3])
  })

  it('parses JSON array from upstream text when data absent', async () => {
    const upstream: ExecutionResult = {
      mediaType: 'text',
      text: '["a","b","c"]',
      durationMs: 0,
    }
    const ctx: NodeRunnerContext = {
      nodeId: 'loop1',
      upstreamOutputs: new Map([['n1', upstream]]),
      resolvedParams: {},
      nodeConfig: {},
    }

    const result = await runner.execute(ctx)
    expect(result.output.data?.['items']).toEqual(['a', 'b', 'c'])
  })

  it('caps items at maxItems', async () => {
    const items = Array.from({ length: 50 }, (_, i) => i)
    const upstream: ExecutionResult = {
      mediaType: 'text',
      text: '',
      data: items as unknown as Record<string, unknown>,
      durationMs: 0,
    }
    const ctx: NodeRunnerContext = {
      nodeId: 'loop1',
      upstreamOutputs: new Map([['n1', upstream]]),
      resolvedParams: {},
      nodeConfig: { maxItems: 10 },
    }

    const result = await runner.execute(ctx)
    expect(result.output.data?.['processedCount']).toBe(10)
    expect(result.output.data?.['totalCount']).toBe(50)
    expect(result.output.data?.['truncated']).toBe(true)
    expect((result.output.data?.['items'] as unknown[]).length).toBe(10)
  })

  it('sets custom itemVariable name', async () => {
    const upstream: ExecutionResult = {
      mediaType: 'text',
      text: '',
      data: ['x'] as unknown as Record<string, unknown>,
      durationMs: 0,
    }
    const ctx: NodeRunnerContext = {
      nodeId: 'loop1',
      upstreamOutputs: new Map([['n1', upstream]]),
      resolvedParams: {},
      nodeConfig: { itemVariable: 'record' },
    }

    const result = await runner.execute(ctx)
    expect(result.output.data?.['itemVariable']).toBe('record')
    expect(result.variableMutations?.['__loop_item_variable']).toBe('record')
  })

  it('defaults itemVariable to "item"', async () => {
    const upstream: ExecutionResult = {
      mediaType: 'text',
      text: '',
      data: ['x'] as unknown as Record<string, unknown>,
      durationMs: 0,
    }
    const ctx: NodeRunnerContext = {
      nodeId: 'loop1',
      upstreamOutputs: new Map([['n1', upstream]]),
      resolvedParams: {},
      nodeConfig: {},
    }

    const result = await runner.execute(ctx)
    expect(result.variableMutations?.['__loop_item_variable']).toBe('item')
  })

  it('sets loop metadata in variableMutations', async () => {
    const upstream: ExecutionResult = {
      mediaType: 'text',
      text: '',
      data: { list: [1, 2] },
      durationMs: 0,
    }
    const ctx: NodeRunnerContext = {
      nodeId: 'loop1',
      upstreamOutputs: new Map([['n1', upstream]]),
      resolvedParams: {},
      nodeConfig: { arrayPath: 'list' },
    }

    const result = await runner.execute(ctx)
    expect(result.variableMutations).toEqual({
      __loop_items: [1, 2],
      __loop_item_variable: 'item',
      __loop_total: 2,
      __loop_processed: 2,
    })
  })

  it('returns empty items when arrayPath points to non-array', async () => {
    const upstream: ExecutionResult = {
      mediaType: 'text',
      text: '',
      data: { notAnArray: 'hello' },
      durationMs: 0,
    }
    const ctx: NodeRunnerContext = {
      nodeId: 'loop1',
      upstreamOutputs: new Map([['n1', upstream]]),
      resolvedParams: {},
      nodeConfig: { arrayPath: 'notAnArray' },
    }

    const result = await runner.execute(ctx)
    expect(result.output.data?.['items']).toEqual([])
  })
})
