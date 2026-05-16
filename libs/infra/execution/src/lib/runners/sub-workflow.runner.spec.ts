import { describe, it, expect } from 'vitest'
import { SubWorkflowRunner } from './sub-workflow.runner'
import type { NodeRunnerContext } from './node-runner.interface'
import type { ExecutionResult } from '../execution.types'

describe('SubWorkflowRunner', () => {
  const runner = new SubWorkflowRunner()

  it('declares node type as sub_workflow', () => {
    expect(runner.nodeType).toBe('sub_workflow')
  })

  it('rejects missing workflowId', async () => {
    const ctx: NodeRunnerContext = {
      nodeId: 'sw1',
      upstreamOutputs: new Map(),
      resolvedParams: {},
      nodeConfig: {},
    }

    const result = await runner.execute(ctx)
    expect(result.output.data?.['error']).toContain('Invalid or missing workflowId')
  })

  it('rejects invalid UUID format', async () => {
    const ctx: NodeRunnerContext = {
      nodeId: 'sw1',
      upstreamOutputs: new Map(),
      resolvedParams: {},
      nodeConfig: { workflowId: 'not-a-uuid' },
    }

    const result = await runner.execute(ctx)
    expect(result.output.data?.['error']).toContain('Invalid or missing workflowId')
  })

  it('emits sub-workflow dispatch envelope with valid UUID', async () => {
    const ctx: NodeRunnerContext = {
      nodeId: 'sw1',
      upstreamOutputs: new Map(),
      resolvedParams: {},
      nodeConfig: { workflowId: '12345678-1234-1234-1234-123456789abc' },
    }

    const result = await runner.execute(ctx)
    expect(result.output.data?.['__sub_workflow_dispatch']).toBe(true)
    expect(result.output.data?.['workflowId']).toBe('12345678-1234-1234-1234-123456789abc')
    expect(result.output.data?.['depth']).toBe(1)
  })

  it('resolves input mapping from upstream outputs', async () => {
    const upstream: ExecutionResult = {
      mediaType: 'text',
      text: 'hello world',
      data: { count: 5 },
      durationMs: 0,
    }
    const ctx: NodeRunnerContext = {
      nodeId: 'sw1',
      upstreamOutputs: new Map([['n1', upstream]]),
      resolvedParams: {},
      nodeConfig: {
        workflowId: '12345678-1234-1234-1234-123456789abc',
        inputMapping: {
          query: 'n1',
          itemCount: 'n1.count',
        },
      },
    }

    const result = await runner.execute(ctx)
    const inputs = result.output.data?.['inputs'] as Record<string, unknown>
    expect(inputs.query).toBe('hello world')
    expect(inputs.itemCount).toBe(5)
  })

  it('blocks execution when max nesting depth exceeded', async () => {
    const ctx: NodeRunnerContext = {
      nodeId: 'sw1',
      upstreamOutputs: new Map(),
      resolvedParams: { __sub_workflow_depth: 3 },
      nodeConfig: { workflowId: '12345678-1234-1234-1234-123456789abc' },
    }

    const result = await runner.execute(ctx)
    expect(result.output.data?.['error']).toContain('nesting depth')
    expect(result.output.data?.['currentDepth']).toBe(3)
  })

  it('respects custom maxDepth capped at 3', async () => {
    const ctx: NodeRunnerContext = {
      nodeId: 'sw1',
      upstreamOutputs: new Map(),
      resolvedParams: { __sub_workflow_depth: 2 },
      nodeConfig: {
        workflowId: '12345678-1234-1234-1234-123456789abc',
        maxDepth: 10, // should be capped to 3
      },
    }

    const result = await runner.execute(ctx)
    // depth=2, max=3, so should succeed
    expect(result.output.data?.['__sub_workflow_dispatch']).toBe(true)
    expect(result.output.data?.['depth']).toBe(3)
  })

  it('blocks at custom maxDepth=2 when depth=2', async () => {
    const ctx: NodeRunnerContext = {
      nodeId: 'sw1',
      upstreamOutputs: new Map(),
      resolvedParams: { __sub_workflow_depth: 2 },
      nodeConfig: {
        workflowId: '12345678-1234-1234-1234-123456789abc',
        maxDepth: 2,
      },
    }

    const result = await runner.execute(ctx)
    expect(result.output.data?.['error']).toContain('nesting depth')
  })

  it('sets variableMutations for downstream depth tracking', async () => {
    const ctx: NodeRunnerContext = {
      nodeId: 'sw1',
      upstreamOutputs: new Map(),
      resolvedParams: {},
      nodeConfig: { workflowId: '12345678-1234-1234-1234-123456789abc' },
    }

    const result = await runner.execute(ctx)
    expect(result.variableMutations?.['__sub_workflow_depth']).toBe(1)
    expect(result.variableMutations?.['__sub_workflow_id']).toBe('12345678-1234-1234-1234-123456789abc')
  })

  it('falls back to resolvedParams when upstream not found in inputMapping', async () => {
    const ctx: NodeRunnerContext = {
      nodeId: 'sw1',
      upstreamOutputs: new Map(),
      resolvedParams: { someGlobal: 'value-from-params' },
      nodeConfig: {
        workflowId: '12345678-1234-1234-1234-123456789abc',
        inputMapping: { target: 'someGlobal' },
      },
    }

    const result = await runner.execute(ctx)
    const inputs = result.output.data?.['inputs'] as Record<string, unknown>
    expect(inputs.target).toBe('value-from-params')
  })
})
