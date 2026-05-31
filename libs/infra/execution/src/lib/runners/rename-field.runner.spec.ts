import { describe, it, expect } from 'vitest'

import { RenameFieldRunner } from './rename-field.runner'

import type { RenameMapping } from './rename-field.runner'
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
    nodeId: 'ren1',
    upstreamOutputs: new Map([['n1', upstream]]),
    resolvedParams: {},
    nodeConfig,
  }
}

describe('RenameFieldRunner', () => {
  const runner = new RenameFieldRunner()

  it('declares node type as rename_field', () => {
    expect(runner.nodeType).toBe('rename_field')
  })

  it('renames keys on a single object, keeping untouched keys', async () => {
    const mappings: RenameMapping[] = [{ from: 'old', to: 'new' }]
    const result = await runner.execute(ctxWith({ old: 1, keep: 2 }, { mappings }))
    expect(result.output.data?.['value']).toEqual({ keep: 2, new: 1 })
  })

  it('accepts mappings as a {from: to} record', async () => {
    const result = await runner.execute(ctxWith({ a: 1, b: 2 }, { mappings: { a: 'x', b: 'y' } }))
    expect(result.output.data?.['value']).toEqual({ x: 1, y: 2 })
  })

  it('dropUnmapped keeps only renamed keys', async () => {
    const mappings: RenameMapping[] = [{ from: 'a', to: 'x' }]
    const result = await runner.execute(ctxWith({ a: 1, b: 2 }, { mappings, dropUnmapped: true }))
    expect(result.output.data?.['value']).toEqual({ x: 1 })
  })

  it('collision: last mapping into the same target wins', async () => {
    const mappings: RenameMapping[] = [
      { from: 'a', to: 'merged' },
      { from: 'b', to: 'merged' },
    ]
    const result = await runner.execute(ctxWith({ a: 1, b: 2 }, { mappings }))
    expect(result.output.data?.['value']).toEqual({ merged: 2 })
  })

  it('renaming onto an existing untouched key overwrites it', async () => {
    const mappings: RenameMapping[] = [{ from: 'a', to: 'b' }]
    const result = await runner.execute(ctxWith({ a: 1, b: 2 }, { mappings }))
    expect(result.output.data?.['value']).toEqual({ b: 1 })
  })

  it('skips mappings whose source key is absent', async () => {
    const mappings: RenameMapping[] = [{ from: 'missing', to: 'x' }]
    const result = await runner.execute(ctxWith({ a: 1 }, { mappings }))
    expect(result.output.data?.['value']).toEqual({ a: 1 })
  })

  it('remaps keys across array items', async () => {
    const mappings: RenameMapping[] = [{ from: 'old', to: 'new' }]
    const result = await runner.execute(ctxWith([{ old: 1 }, { old: 2 }], { mappings }))
    expect(result.output.data?.['items']).toEqual([{ new: 1 }, { new: 2 }])
  })

  it('caps array remapping at maxItems', async () => {
    const mappings: RenameMapping[] = [{ from: 'a', to: 'b' }]
    const big = Array.from({ length: 50 }, () => ({ a: 1 }))
    const result = await runner.execute(ctxWith(big, { mappings, maxItems: 10 }))
    expect(result.output.data?.['count']).toBe(10)
    expect(result.output.data?.['truncated']).toBe(true)
  })

  it('returns non-object source unchanged', async () => {
    const result = await runner.execute(ctxWith('plain', { mappings: { a: 'b' } }))
    expect(result.output.data?.['value']).toBe('plain')
  })
})
