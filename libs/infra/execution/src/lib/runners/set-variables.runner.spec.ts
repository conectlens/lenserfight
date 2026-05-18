import { describe, it, expect, beforeEach } from 'vitest'
import { SetVariablesRunner } from './set-variables.runner'
import { registerNodeRunner, getNodeRunner, clearNodeRunners } from './node-runner.registry'
import type { NodeRunnerContext } from './node-runner.interface'
import type { ExecutionResult } from '../execution.types'

describe('SetVariablesRunner', () => {
  let runner: SetVariablesRunner

  beforeEach(() => {
    clearNodeRunners()
    runner = new SetVariablesRunner()
  })

  it('declares node type as set_variables', () => {
    expect(runner.nodeType).toBe('set_variables')
  })

  it('registers and resolves via NodeRunnerRegistry', () => {
    registerNodeRunner(runner)
    const resolved = getNodeRunner('set_variables')
    expect(resolved).toBe(runner)
  })

  it('returns empty mutations when no variables configured', async () => {
    const ctx: NodeRunnerContext = {
      nodeId: 'node-1',
      upstreamOutputs: new Map(),
      resolvedParams: {},
      nodeConfig: {},
    }

    const result = await runner.execute(ctx)

    expect(result.variableMutations).toEqual({})
    expect(result.output.mediaType).toBe('text')
    expect(result.output.text).toContain('No variables')
  })

  it('sets static variables from config', async () => {
    const ctx: NodeRunnerContext = {
      nodeId: 'node-1',
      upstreamOutputs: new Map(),
      resolvedParams: {},
      nodeConfig: {
        variables: { apiUrl: 'https://api.example.com', retries: '3' },
      },
    }

    const result = await runner.execute(ctx)

    expect(result.variableMutations).toEqual({
      apiUrl: 'https://api.example.com',
      retries: '3',
    })
    expect(result.output.data).toEqual({
      apiUrl: 'https://api.example.com',
      retries: '3',
    })
    expect(result.output.text).toContain('2 variable(s)')
  })

  it('resolves upstream text output references via {{nodeId}}', async () => {
    const upstream: ExecutionResult = {
      mediaType: 'text',
      text: 'Hello from upstream',
      durationMs: 100,
    }
    const ctx: NodeRunnerContext = {
      nodeId: 'node-2',
      upstreamOutputs: new Map([['node-1', upstream]]),
      resolvedParams: {},
      nodeConfig: {
        variables: { greeting: '{{node-1}}' },
      },
    }

    const result = await runner.execute(ctx)

    expect(result.variableMutations).toEqual({ greeting: 'Hello from upstream' })
  })

  it('resolves upstream data field references via {{nodeId.field}}', async () => {
    const upstream: ExecutionResult = {
      mediaType: 'text',
      text: 'json output',
      data: { count: 42, nested: { deep: true } },
      durationMs: 50,
    }
    const ctx: NodeRunnerContext = {
      nodeId: 'node-2',
      upstreamOutputs: new Map([['node-1', upstream]]),
      resolvedParams: {},
      nodeConfig: {
        variables: { totalCount: '{{node-1.count}}' },
      },
    }

    const result = await runner.execute(ctx)

    expect(result.variableMutations).toEqual({ totalCount: 42 })
  })

  it('falls back to resolvedParams when upstream not found', async () => {
    const ctx: NodeRunnerContext = {
      nodeId: 'node-2',
      upstreamOutputs: new Map(),
      resolvedParams: { 'missing-node': 'fallback-value' },
      nodeConfig: {
        variables: { item: '{{missing-node}}' },
      },
    }

    const result = await runner.execute(ctx)

    expect(result.variableMutations).toEqual({ item: 'fallback-value' })
  })

  it('preserves original template when reference is unresolvable', async () => {
    const ctx: NodeRunnerContext = {
      nodeId: 'node-2',
      upstreamOutputs: new Map(),
      resolvedParams: {},
      nodeConfig: {
        variables: { unknown: '{{nonexistent-node.field}}' },
      },
    }

    const result = await runner.execute(ctx)

    expect(result.variableMutations).toEqual({ unknown: '{{nonexistent-node.field}}' })
  })

  it('handles non-object variables config gracefully', async () => {
    const ctx: NodeRunnerContext = {
      nodeId: 'node-1',
      upstreamOutputs: new Map(),
      resolvedParams: {},
      nodeConfig: { variables: 'invalid' },
    }

    const result = await runner.execute(ctx)

    expect(result.variableMutations).toEqual({})
    expect(result.output.text).toContain('No variables')
  })

  it('resolves upstream URL output when text is absent', async () => {
    const upstream: ExecutionResult = {
      mediaType: 'image',
      url: 'https://cdn.example.com/img.png',
      durationMs: 200,
    }
    const ctx: NodeRunnerContext = {
      nodeId: 'node-2',
      upstreamOutputs: new Map([['img-node', upstream]]),
      resolvedParams: {},
      nodeConfig: {
        variables: { imageUrl: '{{img-node}}' },
      },
    }

    const result = await runner.execute(ctx)

    expect(result.variableMutations).toEqual({ imageUrl: 'https://cdn.example.com/img.png' })
  })

  it('reports zero durationMs (no provider call needed)', async () => {
    const ctx: NodeRunnerContext = {
      nodeId: 'node-1',
      upstreamOutputs: new Map(),
      resolvedParams: {},
      nodeConfig: { variables: { x: '1' } },
    }

    const result = await runner.execute(ctx)

    expect(result.output.durationMs).toBe(0)
  })
})
