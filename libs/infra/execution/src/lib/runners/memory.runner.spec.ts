import { describe, it, expect } from 'vitest'
import { MemoryReadRunner, MemoryWriteRunner } from './memory.runner'
import type { NodeRunnerContext } from './node-runner.interface'
import type { ExecutionResult } from '../execution.types'

describe('MemoryReadRunner', () => {
  const runner = new MemoryReadRunner()

  it('declares node type as memory_read', () => { expect(runner.nodeType).toBe('memory_read') })

  it('returns error when no key configured', async () => {
    const ctx: NodeRunnerContext = { nodeId: 'mr1', upstreamOutputs: new Map(), resolvedParams: {}, nodeConfig: {} }
    const result = await runner.execute(ctx)
    expect(result.output.data?.['error']).toContain('No memory key')
  })

  it('returns cached value from resolvedParams', async () => {
    const ctx: NodeRunnerContext = {
      nodeId: 'mr1', upstreamOutputs: new Map(),
      resolvedParams: { __memory_context: 'cached data' },
      nodeConfig: { key: 'context' },
    }
    const result = await runner.execute(ctx)
    expect(result.output.text).toBe('cached data')
    expect(result.output.data?.['source']).toBe('cache')
  })

  it('emits read request when no cached value', async () => {
    const ctx: NodeRunnerContext = {
      nodeId: 'mr1', upstreamOutputs: new Map(),
      resolvedParams: {}, nodeConfig: { key: 'myKey' },
    }
    const result = await runner.execute(ctx)
    expect(result.output.data?.['__memory_read_request']).toBe(true)
    expect(result.output.data?.['key']).toBe('myKey')
  })

  it('passes lenserId config', async () => {
    const ctx: NodeRunnerContext = {
      nodeId: 'mr1', upstreamOutputs: new Map(),
      resolvedParams: {}, nodeConfig: { key: 'k', lenserId: 'abc' },
    }
    const result = await runner.execute(ctx)
    expect(result.output.data?.['lenserId']).toBe('abc')
  })
})

describe('MemoryWriteRunner', () => {
  const runner = new MemoryWriteRunner()

  it('declares node type as memory_write', () => { expect(runner.nodeType).toBe('memory_write') })

  it('returns error when no key configured', async () => {
    const ctx: NodeRunnerContext = { nodeId: 'mw1', upstreamOutputs: new Map(), resolvedParams: {}, nodeConfig: {} }
    const result = await runner.execute(ctx)
    expect(result.output.data?.['error']).toContain('No memory key')
  })

  it('writes explicit value from config', async () => {
    const ctx: NodeRunnerContext = {
      nodeId: 'mw1', upstreamOutputs: new Map(),
      resolvedParams: {}, nodeConfig: { key: 'note', value: 'Remember this' },
    }
    const result = await runner.execute(ctx)
    expect(result.output.data?.['__memory_write_request']).toBe(true)
    expect(result.output.data?.['key']).toBe('note')
    expect(result.output.data?.['value']).toBe('Remember this')
  })

  it('writes upstream text when no explicit value', async () => {
    const upstream: ExecutionResult = { mediaType: 'text', text: 'Upstream content', durationMs: 0 }
    const ctx: NodeRunnerContext = {
      nodeId: 'mw1', upstreamOutputs: new Map([['n1', upstream]]),
      resolvedParams: {}, nodeConfig: { key: 'context' },
    }
    const result = await runner.execute(ctx)
    expect(result.output.data?.['value']).toBe('Upstream content')
  })

  it('returns error when no value available', async () => {
    const ctx: NodeRunnerContext = {
      nodeId: 'mw1', upstreamOutputs: new Map(),
      resolvedParams: {}, nodeConfig: { key: 'empty' },
    }
    const result = await runner.execute(ctx)
    expect(result.output.data?.['error']).toContain('No value')
  })

  it('sets variableMutation with __memory_ prefix for downstream reads', async () => {
    const ctx: NodeRunnerContext = {
      nodeId: 'mw1', upstreamOutputs: new Map(),
      resolvedParams: {}, nodeConfig: { key: 'session', value: 'data123' },
    }
    const result = await runner.execute(ctx)
    expect(result.variableMutations?.['__memory_session']).toBe('data123')
    expect(result.variableMutations?.['__memory_write_key']).toBe('session')
  })

  it('handles object value from upstream data', async () => {
    const upstream: ExecutionResult = { mediaType: 'text', data: { items: [1, 2] }, durationMs: 0 }
    const ctx: NodeRunnerContext = {
      nodeId: 'mw1', upstreamOutputs: new Map([['n1', upstream]]),
      resolvedParams: {}, nodeConfig: { key: 'items' },
    }
    const result = await runner.execute(ctx)
    expect(result.output.data?.['value']).toEqual({ items: [1, 2] })
  })
})
