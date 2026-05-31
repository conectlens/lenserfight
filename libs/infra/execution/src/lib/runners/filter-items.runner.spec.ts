import { describe, it, expect } from 'vitest'

import { FilterItemsRunner } from './filter-items.runner'

import type { FilterCondition } from './filter-items.runner'
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
    nodeId: 'filter1',
    upstreamOutputs: new Map([['n1', upstream]]),
    resolvedParams: {},
    nodeConfig,
  }
}

describe('FilterItemsRunner', () => {
  const runner = new FilterItemsRunner()

  it('declares node type as filter_items', () => {
    expect(runner.nodeType).toBe('filter_items')
  })

  it('returns empty result with no upstream', async () => {
    const result = await runner.execute({
      nodeId: 'filter1',
      upstreamOutputs: new Map(),
      resolvedParams: {},
      nodeConfig: { field: 'x', operator: 'eq', value: 1 },
    })
    expect(result.output.data?.['items']).toEqual([])
    expect(result.output.data?.['outputCount']).toBe(0)
  })

  const sample = [
    { name: 'a', age: 30, tags: ['x', 'y'] },
    { name: 'b', age: 18 },
    { name: 'c', age: 45, tags: ['z'] },
  ]

  const singleConditionCases: Array<{
    name: string
    config: Record<string, unknown>
    expectedNames: string[]
  }> = [
    { name: 'eq', config: { field: 'name', operator: 'eq', value: 'a' }, expectedNames: ['a'] },
    { name: 'neq', config: { field: 'name', operator: 'neq', value: 'a' }, expectedNames: ['b', 'c'] },
    { name: 'gt', config: { field: 'age', operator: 'gt', value: 20 }, expectedNames: ['a', 'c'] },
    { name: 'gte', config: { field: 'age', operator: 'gte', value: 30 }, expectedNames: ['a', 'c'] },
    { name: 'lt', config: { field: 'age', operator: 'lt', value: 30 }, expectedNames: ['b'] },
    { name: 'lte', config: { field: 'age', operator: 'lte', value: 30 }, expectedNames: ['a', 'b'] },
    { name: 'contains (array)', config: { field: 'tags', operator: 'contains', value: 'z' }, expectedNames: ['c'] },
    { name: 'in', config: { field: 'name', operator: 'in', value: ['a', 'c'] }, expectedNames: ['a', 'c'] },
    { name: 'exists (missing field skips)', config: { field: 'tags', operator: 'exists' }, expectedNames: ['a', 'c'] },
  ]

  it.each(singleConditionCases)('filters by single condition: $name', async ({ config, expectedNames }) => {
    const result = await runner.execute(ctxWith({ rows: sample }, { arrayPath: 'rows', ...config }))
    const names = (result.output.data?.['items'] as Array<{ name: string }>).map((r) => r.name)
    expect(names).toEqual(expectedNames)
  })

  it('treats missing field as undefined (does not throw)', async () => {
    const result = await runner.execute(ctxWith({ rows: sample }, { arrayPath: 'rows', field: 'nope', operator: 'eq', value: 'x' }))
    expect(result.output.data?.['items']).toEqual([])
  })

  it('combines conditions with AND', async () => {
    const conditions: FilterCondition[] = [
      { field: 'age', operator: 'gt', value: 20 },
      { field: 'name', operator: 'eq', value: 'a' },
    ]
    const result = await runner.execute(ctxWith({ rows: sample }, { arrayPath: 'rows', match: 'and', conditions }))
    const names = (result.output.data?.['items'] as Array<{ name: string }>).map((r) => r.name)
    expect(names).toEqual(['a'])
  })

  it('combines conditions with OR', async () => {
    const conditions: FilterCondition[] = [
      { field: 'name', operator: 'eq', value: 'a' },
      { field: 'name', operator: 'eq', value: 'c' },
    ]
    const result = await runner.execute(ctxWith({ rows: sample }, { arrayPath: 'rows', match: 'or', conditions }))
    const names = (result.output.data?.['items'] as Array<{ name: string }>).map((r) => r.name)
    expect(names).toEqual(['a', 'c'])
  })

  it('passes everything through when no predicate configured', async () => {
    const result = await runner.execute(ctxWith({ rows: sample }, { arrayPath: 'rows' }))
    expect((result.output.data?.['items'] as unknown[]).length).toBe(3)
  })

  it('uses root array when no arrayPath', async () => {
    const result = await runner.execute(ctxWith([1, 2, 3, 4], { operator: 'gt', value: 2 }))
    expect(result.output.data?.['items']).toEqual([3, 4])
  })

  it('caps input at maxItems', async () => {
    const big = Array.from({ length: 50 }, (_, i) => ({ n: i }))
    const result = await runner.execute(ctxWith(big, { maxItems: 10, field: 'n', operator: 'gte', value: 0 }))
    expect(result.output.data?.['inputCount']).toBe(10)
    expect(result.output.data?.['truncated']).toBe(true)
  })

  it('parses upstream JSON text when data absent', async () => {
    const upstream: ExecutionResult = { mediaType: 'text', text: '[{"n":1},{"n":2}]', durationMs: 0 }
    const result = await runner.execute({
      nodeId: 'filter1',
      upstreamOutputs: new Map([['n1', upstream]]),
      resolvedParams: {},
      nodeConfig: { field: 'n', operator: 'gt', value: 1 },
    })
    expect(result.output.data?.['items']).toEqual([{ n: 2 }])
  })
})
