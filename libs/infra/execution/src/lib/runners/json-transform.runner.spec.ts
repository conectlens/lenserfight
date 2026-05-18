import { describe, it, expect } from 'vitest'
import { JsonTransformRunner } from './json-transform.runner'
import type { NodeRunnerContext } from './node-runner.interface'
import type { ExecutionResult } from '../execution.types'

describe('JsonTransformRunner', () => {
  const runner = new JsonTransformRunner()

  it('declares node type as json_transform', () => {
    expect(runner.nodeType).toBe('json_transform')
  })

  it('returns error when no expression configured', async () => {
    const ctx: NodeRunnerContext = {
      nodeId: 'n1',
      upstreamOutputs: new Map(),
      resolvedParams: {},
      nodeConfig: {},
    }

    const result = await runner.execute(ctx)
    expect(result.output.data?.['error']).toContain('No expression')
  })

  it('extracts simple field from upstream data', async () => {
    const upstream: ExecutionResult = {
      mediaType: 'text',
      text: '',
      data: { name: 'Alice', age: 30 },
      durationMs: 0,
    }
    const ctx: NodeRunnerContext = {
      nodeId: 'n2',
      upstreamOutputs: new Map([['n1', upstream]]),
      resolvedParams: {},
      nodeConfig: { expression: 'name' },
    }

    const result = await runner.execute(ctx)
    expect(result.output.text).toBe('Alice')
    expect(result.output.data?.['value']).toBe('Alice')
  })

  it('extracts nested field via dot notation', async () => {
    const upstream: ExecutionResult = {
      mediaType: 'text',
      text: '',
      data: { user: { profile: { email: 'a@b.c' } } },
      durationMs: 0,
    }
    const ctx: NodeRunnerContext = {
      nodeId: 'n2',
      upstreamOutputs: new Map([['n1', upstream]]),
      resolvedParams: {},
      nodeConfig: { expression: 'user.profile.email' },
    }

    const result = await runner.execute(ctx)
    expect(result.output.text).toBe('a@b.c')
  })

  it('extracts array element via bracket notation', async () => {
    const upstream: ExecutionResult = {
      mediaType: 'text',
      text: '',
      data: { items: ['zero', 'one', 'two'] },
      durationMs: 0,
    }
    const ctx: NodeRunnerContext = {
      nodeId: 'n2',
      upstreamOutputs: new Map([['n1', upstream]]),
      resolvedParams: {},
      nodeConfig: { expression: 'items[1]' },
    }

    const result = await runner.execute(ctx)
    expect(result.output.text).toBe('one')
  })

  it('extracts from a specific source node via sourceNodeId', async () => {
    const upstream1: ExecutionResult = { mediaType: 'text', text: '', data: { x: 1 }, durationMs: 0 }
    const upstream2: ExecutionResult = { mediaType: 'text', text: '', data: { x: 2 }, durationMs: 0 }

    const ctx: NodeRunnerContext = {
      nodeId: 'n3',
      upstreamOutputs: new Map([['n1', upstream1], ['n2', upstream2]]),
      resolvedParams: {},
      nodeConfig: { expression: 'x', sourceNodeId: 'n2' },
    }

    const result = await runner.execute(ctx)
    expect(result.output.data?.['value']).toBe(2)
  })

  it('parses JSON from upstream text when data is absent', async () => {
    const upstream: ExecutionResult = {
      mediaType: 'text',
      text: '{"status":"ok","count":5}',
      durationMs: 0,
    }
    const ctx: NodeRunnerContext = {
      nodeId: 'n2',
      upstreamOutputs: new Map([['n1', upstream]]),
      resolvedParams: {},
      nodeConfig: { expression: 'count' },
    }

    const result = await runner.execute(ctx)
    expect(result.output.data?.['value']).toBe(5)
  })

  it('returns null for non-existent path', async () => {
    const upstream: ExecutionResult = {
      mediaType: 'text',
      text: '',
      data: { name: 'Alice' },
      durationMs: 0,
    }
    const ctx: NodeRunnerContext = {
      nodeId: 'n2',
      upstreamOutputs: new Map([['n1', upstream]]),
      resolvedParams: {},
      nodeConfig: { expression: 'nonexistent.path' },
    }

    const result = await runner.execute(ctx)
    expect(result.output.text).toBe('null')
    expect(result.output.data?.['value']).toBeUndefined()
  })

  it('rejects prototype pollution attempts', async () => {
    const upstream: ExecutionResult = {
      mediaType: 'text',
      text: '',
      data: { safe: true },
      durationMs: 0,
    }
    const ctx: NodeRunnerContext = {
      nodeId: 'n2',
      upstreamOutputs: new Map([['n1', upstream]]),
      resolvedParams: {},
      nodeConfig: { expression: '__proto__.polluted' },
    }

    const result = await runner.execute(ctx)
    expect(result.output.data?.['value']).toBeUndefined()
  })

  it('rejects constructor traversal', async () => {
    const upstream: ExecutionResult = {
      mediaType: 'text',
      text: '',
      data: { x: 1 },
      durationMs: 0,
    }
    const ctx: NodeRunnerContext = {
      nodeId: 'n2',
      upstreamOutputs: new Map([['n1', upstream]]),
      resolvedParams: {},
      nodeConfig: { expression: 'constructor.name' },
    }

    const result = await runner.execute(ctx)
    expect(result.output.data?.['value']).toBeUndefined()
  })

  it('reports zero durationMs', async () => {
    const upstream: ExecutionResult = { mediaType: 'text', text: '', data: { a: 1 }, durationMs: 0 }
    const ctx: NodeRunnerContext = {
      nodeId: 'n2',
      upstreamOutputs: new Map([['n1', upstream]]),
      resolvedParams: {},
      nodeConfig: { expression: 'a' },
    }

    const result = await runner.execute(ctx)
    expect(result.output.durationMs).toBe(0)
  })
})
