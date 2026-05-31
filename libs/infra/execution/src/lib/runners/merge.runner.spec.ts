import { describe, it, expect } from 'vitest'

import { MergeRunner } from './merge.runner'

import type { NodeRunnerContext } from './node-runner.interface'
import type { ExecutionResult } from '../execution.types'

function ctxWith(
  nodeConfig: Record<string, unknown>,
  upstreams: ExecutionResult[],
): NodeRunnerContext {
  const map = new Map<string, ExecutionResult>()
  upstreams.forEach((u, i) => map.set(`n${i}`, u))
  return { nodeId: 'm1', upstreamOutputs: map, resolvedParams: {}, nodeConfig }
}

/** Upstream whose structured `data` is an object payload. */
function obj(value: Record<string, unknown>): ExecutionResult {
  return { mediaType: 'text', text: '', data: value, durationMs: 0 }
}

/**
 * Upstream whose structured `data` is array-shaped. `ExecutionResult.data` is
 * typed `Record<string, unknown>`, but the engine spreads array-shaped runner
 * output at runtime, so the cast mirrors real behavior.
 */
function arr(items: unknown[]): ExecutionResult {
  return { mediaType: 'text', text: '', data: items as unknown as Record<string, unknown>, durationMs: 0 }
}

/** Upstream that carries its payload as JSON text (no structured data). */
function jsonText(text: string): ExecutionResult {
  return { mediaType: 'text', text, durationMs: 0 }
}

describe('MergeRunner', () => {
  const runner = new MergeRunner()

  it('declares node type as merge', () => {
    expect(runner.nodeType).toBe('merge')
  })

  // ── append mode ──
  it('append: concatenates array payloads from multiple branches', async () => {
    const result = await runner.execute(ctxWith({ mode: 'append' }, [arr([1, 2]), arr([3, 4])]))
    expect(result.output.data?.['items']).toEqual([1, 2, 3, 4])
    expect(result.output.data?.['branchCount']).toBe(2)
  })

  it('append is the default mode', async () => {
    const result = await runner.execute(ctxWith({}, [arr(['a']), arr(['b'])]))
    expect(result.output.data?.['mode']).toBe('append')
    expect(result.output.data?.['items']).toEqual(['a', 'b'])
  })

  it('append: wraps non-array payloads into single items', async () => {
    const result = await runner.execute(ctxWith({ mode: 'append' }, [obj({ x: 1 })]))
    expect(result.output.data?.['items']).toEqual([{ x: 1 }])
  })

  it('append: caps emitted items at maxItems', async () => {
    const big = Array.from({ length: 50 }, (_, i) => i)
    const result = await runner.execute(ctxWith({ mode: 'append', maxItems: 10 }, [arr(big)]))
    expect((result.output.data?.['items'] as unknown[]).length).toBe(10)
    expect(result.output.data?.['truncated']).toBe(true)
  })

  // ── combine mode ──
  it('combine: shallow-merges object payloads (later branch wins)', async () => {
    const result = await runner.execute(
      ctxWith({ mode: 'combine' }, [obj({ a: 1, b: 1 }), obj({ b: 2, c: 3 })]),
    )
    expect(result.output.data?.['merged']).toEqual({ a: 1, b: 2, c: 3 })
  })

  it('combine: ignores non-object payloads', async () => {
    const result = await runner.execute(ctxWith({ mode: 'combine' }, [obj({ a: 1 }), arr([9])]))
    expect(result.output.data?.['merged']).toEqual({ a: 1 })
  })

  // ── key_join mode ──
  it('key_join: joins two arrays on a matching key', async () => {
    const left = arr([{ id: 1, name: 'a' }, { id: 2, name: 'b' }])
    const right = arr([{ id: 1, score: 10 }, { id: 2, score: 20 }])
    const result = await runner.execute(ctxWith({ mode: 'key_join', joinKey: 'id' }, [left, right]))
    expect(result.output.data?.['items']).toEqual([
      { id: 1, name: 'a', score: 10 },
      { id: 2, name: 'b', score: 20 },
    ])
  })

  it('key_join: drops left rows with no right match', async () => {
    const left = arr([{ id: 1 }, { id: 99 }])
    const right = arr([{ id: 1, v: 'x' }])
    const result = await runner.execute(ctxWith({ mode: 'key_join', joinKey: 'id' }, [left, right]))
    expect(result.output.data?.['items']).toEqual([{ id: 1, v: 'x' }])
  })

  it('key_join: produces no rows when joinKey is missing from config', async () => {
    const result = await runner.execute(
      ctxWith({ mode: 'key_join' }, [arr([{ id: 1 }]), arr([{ id: 1 }])]),
    )
    expect(result.output.data?.['items']).toEqual([])
  })

  // ── edge cases ──
  it('handles zero inputs (no branches present)', async () => {
    const result = await runner.execute(ctxWith({ mode: 'append' }, []))
    expect(result.output.data?.['items']).toEqual([])
    expect(result.output.data?.['branchCount']).toBe(0)
  })

  it('handles a single input', async () => {
    const result = await runner.execute(ctxWith({ mode: 'append' }, [arr([1, 2, 3])]))
    expect(result.output.data?.['items']).toEqual([1, 2, 3])
  })

  it('skips a missing/empty branch payload', async () => {
    const result = await runner.execute(
      ctxWith({ mode: 'append' }, [arr([1]), { mediaType: 'text', durationMs: 0 }]),
    )
    // second branch has no data and no text → contributes nothing
    expect(result.output.data?.['items']).toEqual([1])
    expect(result.output.data?.['branchCount']).toBe(1)
  })

  it('parses JSON text payloads when data is absent', async () => {
    const result = await runner.execute(ctxWith({ mode: 'append' }, [jsonText('[1,2]')]))
    expect(result.output.data?.['items']).toEqual([1, 2])
  })
})
