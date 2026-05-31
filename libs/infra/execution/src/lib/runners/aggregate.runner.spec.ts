import { describe, it, expect } from 'vitest'

import { AggregateRunner } from './aggregate.runner'

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
    nodeId: 'agg1',
    upstreamOutputs: new Map([['n1', upstream]]),
    resolvedParams: {},
    nodeConfig,
  }
}

const sales = [
  { region: 'us', amount: 100, rep: 'a' },
  { region: 'us', amount: 200, rep: 'b' },
  { region: 'eu', amount: 50, rep: 'c' },
  { region: 'eu', amount: 50, rep: 'c' },
]

describe('AggregateRunner', () => {
  const runner = new AggregateRunner()

  it('declares node type as aggregate', () => {
    expect(runner.nodeType).toBe('aggregate')
  })

  it('returns count 0 with no upstream', async () => {
    const result = await runner.execute({
      nodeId: 'agg1',
      upstreamOutputs: new Map(),
      resolvedParams: {},
      nodeConfig: { operation: 'count' },
    })
    expect(result.output.data?.['value']).toBe(0)
  })

  const ungroupedCases: Array<{ name: string; config: Record<string, unknown>; expected: unknown }> = [
    { name: 'count', config: { operation: 'count' }, expected: 4 },
    { name: 'sum', config: { operation: 'sum', field: 'amount' }, expected: 400 },
    { name: 'avg', config: { operation: 'avg', field: 'amount' }, expected: 100 },
    { name: 'min', config: { operation: 'min', field: 'amount' }, expected: 50 },
    { name: 'max', config: { operation: 'max', field: 'amount' }, expected: 200 },
    { name: 'unique', config: { operation: 'unique', field: 'region' }, expected: ['us', 'eu'] },
    { name: 'first', config: { operation: 'first', field: 'rep' }, expected: 'a' },
    { name: 'last', config: { operation: 'last', field: 'rep' }, expected: 'c' },
  ]

  it.each(ungroupedCases)('aggregates whole array: $name', async ({ config, expected }) => {
    const result = await runner.execute(ctxWith(sales, config))
    expect(result.output.data?.['value']).toEqual(expected)
  })

  it('groups by field with count', async () => {
    const result = await runner.execute(ctxWith(sales, { groupBy: 'region', operation: 'count' }))
    expect(result.output.data?.['groups']).toEqual([
      { key: 'us', value: 2, count: 2 },
      { key: 'eu', value: 2, count: 2 },
    ])
  })

  it('groups by field with sum', async () => {
    const result = await runner.execute(ctxWith(sales, { groupBy: 'region', operation: 'sum', field: 'amount' }))
    expect(result.output.data?.['groups']).toEqual([
      { key: 'us', value: 300, count: 2 },
      { key: 'eu', value: 100, count: 2 },
    ])
  })

  it('avg of empty numeric values is 0', async () => {
    const result = await runner.execute(ctxWith([{ x: 'nope' }], { operation: 'avg', field: 'x' }))
    expect(result.output.data?.['value']).toBe(0)
  })

  it('min/max of no numeric values is null', async () => {
    const result = await runner.execute(ctxWith([{ x: 'nope' }], { operation: 'min', field: 'x' }))
    expect(result.output.data?.['value']).toBeNull()
  })

  it('defaults to count operation', async () => {
    const result = await runner.execute(ctxWith(sales, {}))
    expect(result.output.data?.['value']).toBe(4)
  })

  it('handles non-array source as empty', async () => {
    const result = await runner.execute(ctxWith({ notArray: true }, { operation: 'count' }))
    expect(result.output.data?.['value']).toBe(0)
  })

  it('caps at maxItems', async () => {
    const big = Array.from({ length: 50 }, () => ({ amount: 1 }))
    const result = await runner.execute(ctxWith(big, { operation: 'sum', field: 'amount', maxItems: 10 }))
    expect(result.output.data?.['value']).toBe(10)
    expect(result.output.data?.['truncated']).toBe(true)
  })
})
