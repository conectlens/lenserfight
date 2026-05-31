import { describe, it, expect } from 'vitest'

import { SortRunner } from './sort.runner'

import type { SortKey } from './sort.runner'
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
    nodeId: 'sort1',
    upstreamOutputs: new Map([['n1', upstream]]),
    resolvedParams: {},
    nodeConfig,
  }
}

describe('SortRunner', () => {
  const runner = new SortRunner()

  it('declares node type as sort', () => {
    expect(runner.nodeType).toBe('sort')
  })

  it('returns empty when no upstream', async () => {
    const result = await runner.execute({
      nodeId: 'sort1',
      upstreamOutputs: new Map(),
      resolvedParams: {},
      nodeConfig: { field: 'x' },
    })
    expect(result.output.data?.['items']).toEqual([])
  })

  it('sorts numbers ascending by default', async () => {
    const result = await runner.execute(ctxWith([{ n: 3 }, { n: 1 }, { n: 2 }], { field: 'n' }))
    expect((result.output.data?.['items'] as Array<{ n: number }>).map((i) => i.n)).toEqual([1, 2, 3])
  })

  it('sorts descending', async () => {
    const result = await runner.execute(ctxWith([{ n: 1 }, { n: 3 }, { n: 2 }], { field: 'n', direction: 'desc' }))
    expect((result.output.data?.['items'] as Array<{ n: number }>).map((i) => i.n)).toEqual([3, 2, 1])
  })

  it('sorts strings lexicographically', async () => {
    const result = await runner.execute(ctxWith([{ s: 'banana' }, { s: 'apple' }, { s: 'cherry' }], { field: 's' }))
    expect((result.output.data?.['items'] as Array<{ s: string }>).map((i) => i.s)).toEqual(['apple', 'banana', 'cherry'])
  })

  it('is stable: preserves input order on ties', async () => {
    const data = [
      { g: 1, id: 'a' },
      { g: 1, id: 'b' },
      { g: 1, id: 'c' },
    ]
    const result = await runner.execute(ctxWith(data, { field: 'g' }))
    expect((result.output.data?.['items'] as Array<{ id: string }>).map((i) => i.id)).toEqual(['a', 'b', 'c'])
  })

  it('multi-field sort: primary then secondary tie-break', async () => {
    const data = [
      { dept: 'b', age: 40 },
      { dept: 'a', age: 50 },
      { dept: 'a', age: 30 },
      { dept: 'b', age: 20 },
    ]
    const sortBy: SortKey[] = [
      { field: 'dept', direction: 'asc' },
      { field: 'age', direction: 'desc' },
    ]
    const result = await runner.execute(ctxWith(data, { sortBy }))
    expect((result.output.data?.['items'] as Array<{ dept: string; age: number }>)).toEqual([
      { dept: 'a', age: 50 },
      { dept: 'a', age: 30 },
      { dept: 'b', age: 40 },
      { dept: 'b', age: 20 },
    ])
  })

  it('sorts nullish values last', async () => {
    const data = [{ n: 2 }, { n: null }, { n: 1 }]
    const result = await runner.execute(ctxWith(data, { field: 'n' }))
    expect((result.output.data?.['items'] as Array<{ n: number | null }>).map((i) => i.n)).toEqual([1, 2, null])
  })

  it('returns items unchanged when no sort key configured', async () => {
    const data = [{ n: 3 }, { n: 1 }]
    const result = await runner.execute(ctxWith(data, {}))
    expect(result.output.data?.['items']).toEqual(data)
  })

  it('caps at maxItems', async () => {
    const big = Array.from({ length: 50 }, (_, i) => ({ n: 50 - i }))
    const result = await runner.execute(ctxWith(big, { field: 'n', maxItems: 10 }))
    expect(result.output.data?.['count']).toBe(10)
    expect(result.output.data?.['truncated']).toBe(true)
  })
})
