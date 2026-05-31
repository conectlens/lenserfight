import { describe, it, expect } from 'vitest'

import { DeduplicateRunner } from './deduplicate.runner'

import type { NodeRunnerContext } from './node-runner.interface'
import type { ExecutionResult } from '../execution.types'

function ctxWith(data: unknown, nodeConfig: Record<string, unknown>): NodeRunnerContext {
  const upstream: ExecutionResult = {
    mediaType: 'text',
    text: '',
    data: data as Record<string, unknown>,
    durationMs: 0,
  }
  return {
    nodeId: 'dedup1',
    upstreamOutputs: new Map([['n1', upstream]]),
    resolvedParams: {},
    nodeConfig,
  }
}

describe('DeduplicateRunner', () => {
  const runner = new DeduplicateRunner()

  it('declares node type as deduplicate', () => {
    expect(runner.nodeType).toBe('deduplicate')
  })

  it('returns empty with no upstream', async () => {
    const result = await runner.execute({
      nodeId: 'dedup1',
      upstreamOutputs: new Map(),
      resolvedParams: {},
      nodeConfig: {},
    })
    expect(result.output.data?.['items']).toEqual([])
  })

  it('dedupes whole primitives keeping first', async () => {
    const result = await runner.execute(ctxWith([1, 2, 2, 3, 1], {}))
    expect(result.output.data?.['items']).toEqual([1, 2, 3])
    expect(result.output.data?.['removed']).toBe(2)
  })

  it('dedupes whole objects by JSON identity', async () => {
    const result = await runner.execute(ctxWith([{ a: 1 }, { a: 1 }, { a: 2 }], {}))
    expect(result.output.data?.['items']).toEqual([{ a: 1 }, { a: 2 }])
  })

  it('dedupes by single key keeping first', async () => {
    const data = [
      { id: 1, v: 'a' },
      { id: 2, v: 'b' },
      { id: 1, v: 'c' },
    ]
    const result = await runner.execute(ctxWith(data, { keys: 'id', keep: 'first' }))
    expect(result.output.data?.['items']).toEqual([
      { id: 1, v: 'a' },
      { id: 2, v: 'b' },
    ])
  })

  it('dedupes by single key keeping last (order preserved)', async () => {
    const data = [
      { id: 1, v: 'a' },
      { id: 2, v: 'b' },
      { id: 1, v: 'c' },
    ]
    const result = await runner.execute(ctxWith(data, { keys: 'id', keep: 'last' }))
    expect(result.output.data?.['items']).toEqual([
      { id: 1, v: 'c' },
      { id: 2, v: 'b' },
    ])
  })

  it('dedupes by composite keys', async () => {
    const data = [
      { a: 1, b: 'x' },
      { a: 1, b: 'y' },
      { a: 1, b: 'x' },
    ]
    const result = await runner.execute(ctxWith(data, { keys: ['a', 'b'] }))
    expect(result.output.data?.['items']).toEqual([
      { a: 1, b: 'x' },
      { a: 1, b: 'y' },
    ])
  })

  it('treats missing key values as equal (single bucket)', async () => {
    const data = [{ other: 1 }, { other: 2 }]
    const result = await runner.execute(ctxWith(data, { keys: 'id' }))
    expect((result.output.data?.['items'] as unknown[]).length).toBe(1)
  })

  it('handles non-array source as empty', async () => {
    const result = await runner.execute(ctxWith({ notArray: true }, {}))
    expect(result.output.data?.['items']).toEqual([])
  })

  it('caps at maxItems before dedupe', async () => {
    const big = Array.from({ length: 50 }, (_, i) => ({ id: i }))
    const result = await runner.execute(ctxWith(big, { keys: 'id', maxItems: 10 }))
    expect(result.output.data?.['inputCount']).toBe(10)
    expect(result.output.data?.['truncated']).toBe(true)
  })
})
