import { describe, it, expect } from 'vitest'
import { ErrorCatchRunner } from './error-catch.runner'
import type { NodeRunnerContext } from './node-runner.interface'

describe('ErrorCatchRunner', () => {
  const runner = new ErrorCatchRunner()

  it('declares node type as error_catch', () => {
    expect(runner.nodeType).toBe('error_catch')
  })

  it('extracts error context from resolvedParams', async () => {
    const ctx: NodeRunnerContext = {
      nodeId: 'catch-1',
      upstreamOutputs: new Map(),
      resolvedParams: {
        __error_node_id: 'failing-node',
        __error_message: 'Provider rate limited',
        __error_code: 'rate_limit',
        __error_retry_count: 3,
      },
      nodeConfig: {},
    }

    const result = await runner.execute(ctx)

    expect(result.output.data?.['sourceNodeId']).toBe('failing-node')
    expect(result.output.data?.['error']).toBe('Provider rate limited')
    expect(result.output.data?.['errorCode']).toBe('rate_limit')
    expect(result.output.data?.['retryCount']).toBe(3)
    expect(result.output.data?.['recovered']).toBe(true)
  })

  it('uses fallbackValue when configured', async () => {
    const ctx: NodeRunnerContext = {
      nodeId: 'catch-1',
      upstreamOutputs: new Map(),
      resolvedParams: {
        __error_node_id: 'n1',
        __error_message: 'timeout',
      },
      nodeConfig: { fallbackValue: 'default-response' },
    }

    const result = await runner.execute(ctx)

    expect(result.output.text).toBe('default-response')
    expect(result.output.data?.['fallbackValue']).toBe('default-response')
  })

  it('marks recovered=false when continueOnError is false', async () => {
    const ctx: NodeRunnerContext = {
      nodeId: 'catch-1',
      upstreamOutputs: new Map(),
      resolvedParams: { __error_node_id: 'n1' },
      nodeConfig: { continueOnError: false },
    }

    const result = await runner.execute(ctx)

    expect(result.output.data?.['recovered']).toBe(false)
    expect(result.variableMutations?.['__error_recovered']).toBe(false)
  })

  it('handles missing error context gracefully', async () => {
    const ctx: NodeRunnerContext = {
      nodeId: 'catch-1',
      upstreamOutputs: new Map(),
      resolvedParams: {},
      nodeConfig: {},
    }

    const result = await runner.execute(ctx)

    expect(result.output.data?.['sourceNodeId']).toBeNull()
    expect(result.output.data?.['error']).toBe('Unknown error')
    expect(result.output.data?.['errorCode']).toBe('unknown')
    expect(result.output.data?.['retryCount']).toBe(0)
    expect(result.output.text).toContain('Error caught from unknown')
  })

  it('sets variable mutations for downstream routing', async () => {
    const ctx: NodeRunnerContext = {
      nodeId: 'catch-1',
      upstreamOutputs: new Map(),
      resolvedParams: { __error_node_id: 'broken-node' },
      nodeConfig: {},
    }

    const result = await runner.execute(ctx)

    expect(result.variableMutations).toEqual({
      __error_recovered: true,
      __error_source: 'broken-node',
    })
  })

  it('reports zero durationMs', async () => {
    const ctx: NodeRunnerContext = {
      nodeId: 'catch-1',
      upstreamOutputs: new Map(),
      resolvedParams: {},
      nodeConfig: {},
    }

    const result = await runner.execute(ctx)
    expect(result.output.durationMs).toBe(0)
  })
})
