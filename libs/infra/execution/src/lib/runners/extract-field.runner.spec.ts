import { describe, it, expect } from 'vitest'

import { ExtractFieldRunner } from './extract-field.runner'

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
    nodeId: 'ex1',
    upstreamOutputs: new Map([['n1', upstream]]),
    resolvedParams: {},
    nodeConfig,
  }
}

describe('ExtractFieldRunner', () => {
  const runner = new ExtractFieldRunner()

  it('declares node type as extract_field', () => {
    expect(runner.nodeType).toBe('extract_field')
  })

  it('extracts nested single field from object', async () => {
    const result = await runner.execute(ctxWith({ user: { profile: { name: 'Alice' } } }, { field: 'user.profile.name' }))
    expect(result.output.data?.['value']).toBe('Alice')
  })

  it('returns undefined for missing path', async () => {
    const result = await runner.execute(ctxWith({ user: {} }, { field: 'user.profile.name' }))
    expect(result.output.data?.['value']).toBeUndefined()
  })

  it('projects multiple fields from object with rename via as', async () => {
    const result = await runner.execute(
      ctxWith({ user: { id: 7, name: 'Bob' }, ts: 100 }, {
        fields: [{ path: 'user.id', as: 'userId' }, 'user.name', 'ts'],
      }),
    )
    expect(result.output.data).toEqual({ userId: 7, name: 'Bob', ts: 100 })
  })

  it('flattens single field across array items', async () => {
    const result = await runner.execute(
      ctxWith({ rows: [{ name: 'a' }, { name: 'b' }, { name: 'c' }] }, { arrayPath: 'rows', field: 'name' }),
    )
    expect(result.output.data?.['items']).toEqual(['a', 'b', 'c'])
  })

  it('projects multiple fields across array items', async () => {
    const result = await runner.execute(
      ctxWith([{ a: 1, b: 2, c: 3 }, { a: 4, b: 5, c: 6 }], { fields: ['a', 'c'] }),
    )
    expect(result.output.data?.['items']).toEqual([{ a: 1, c: 3 }, { a: 4, c: 6 }])
  })

  it('missing nested path yields undefined per item', async () => {
    const result = await runner.execute(
      ctxWith({ rows: [{ name: 'a' }, { other: 'b' }] }, { arrayPath: 'rows', field: 'name' }),
    )
    expect(result.output.data?.['items']).toEqual(['a', undefined])
  })

  it('returns empty items when arrayPath points to non-array', async () => {
    const result = await runner.execute(ctxWith({ rows: 'nope' }, { arrayPath: 'rows', field: 'x' }))
    expect(result.output.data?.['items']).toEqual([])
  })

  it('caps array projection at maxItems', async () => {
    const big = Array.from({ length: 50 }, (_, i) => ({ n: i }))
    const result = await runner.execute(ctxWith(big, { field: 'n', maxItems: 10 }))
    expect(result.output.data?.['count']).toBe(10)
    expect(result.output.data?.['truncated']).toBe(true)
  })

  it('parses upstream JSON text when data absent', async () => {
    const upstream: ExecutionResult = { mediaType: 'text', text: '{"a":{"b":42}}', durationMs: 0 }
    const result = await runner.execute({
      nodeId: 'ex1',
      upstreamOutputs: new Map([['n1', upstream]]),
      resolvedParams: {},
      nodeConfig: { field: 'a.b' },
    })
    expect(result.output.data?.['value']).toBe(42)
  })
})
