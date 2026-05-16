import { describe, it, expect } from 'vitest'
import { SwitchRunner } from './switch.runner'
import type { SwitchCase } from './switch.runner'
import type { NodeRunnerContext } from './node-runner.interface'
import type { ExecutionResult } from '../execution.types'

describe('SwitchRunner', () => {
  const runner = new SwitchRunner()

  it('declares node type as switch', () => {
    expect(runner.nodeType).toBe('switch')
  })

  it('routes to default when no cases configured', async () => {
    const ctx: NodeRunnerContext = {
      nodeId: 'sw1',
      upstreamOutputs: new Map(),
      resolvedParams: {},
      nodeConfig: {},
    }

    const result = await runner.execute(ctx)
    expect(result.output.data?.['matchedBranch']).toBe('default')
    expect(result.variableMutations?.['__switch_branch']).toBe('default')
  })

  it('routes to custom default branch name', async () => {
    const ctx: NodeRunnerContext = {
      nodeId: 'sw1',
      upstreamOutputs: new Map(),
      resolvedParams: {},
      nodeConfig: { cases: [], defaultBranch: 'fallback' },
    }

    const result = await runner.execute(ctx)
    expect(result.output.data?.['matchedBranch']).toBe('fallback')
  })

  it('matches first case with equals operator', async () => {
    const upstream: ExecutionResult = { mediaType: 'text', text: 'error', durationMs: 0 }
    const cases: SwitchCase[] = [
      { label: 'success', expression: '', operator: 'equals', value: 'success' },
      { label: 'error', expression: '', operator: 'equals', value: 'error' },
    ]
    const ctx: NodeRunnerContext = {
      nodeId: 'sw1',
      upstreamOutputs: new Map([['n1', upstream]]),
      resolvedParams: {},
      nodeConfig: { cases },
    }

    const result = await runner.execute(ctx)
    expect(result.output.data?.['matchedBranch']).toBe('error')
    expect(result.output.data?.['matchedIndex']).toBe(1)
  })

  it('returns first match when multiple cases match', async () => {
    const upstream: ExecutionResult = { mediaType: 'text', text: 'hello', durationMs: 0 }
    const cases: SwitchCase[] = [
      { label: 'first', expression: '', operator: 'contains', value: 'hello' },
      { label: 'second', expression: '', operator: 'contains', value: 'hell' },
    ]
    const ctx: NodeRunnerContext = {
      nodeId: 'sw1',
      upstreamOutputs: new Map([['n1', upstream]]),
      resolvedParams: {},
      nodeConfig: { cases },
    }

    const result = await runner.execute(ctx)
    expect(result.output.data?.['matchedBranch']).toBe('first')
    expect(result.output.data?.['matchedIndex']).toBe(0)
  })

  it('evaluates not_equals operator', async () => {
    const upstream: ExecutionResult = { mediaType: 'text', text: 'active', durationMs: 0 }
    const cases: SwitchCase[] = [
      { label: 'not-pending', expression: '', operator: 'not_equals', value: 'pending' },
    ]
    const ctx: NodeRunnerContext = {
      nodeId: 'sw1',
      upstreamOutputs: new Map([['n1', upstream]]),
      resolvedParams: {},
      nodeConfig: { cases },
    }

    const result = await runner.execute(ctx)
    expect(result.output.data?.['matchedBranch']).toBe('not-pending')
  })

  it('evaluates greater_than operator with numeric values', async () => {
    const upstream: ExecutionResult = { mediaType: 'text', text: '42', durationMs: 0 }
    const cases: SwitchCase[] = [
      { label: 'small', expression: '', operator: 'less_than', value: '10' },
      { label: 'big', expression: '', operator: 'greater_than', value: '30' },
    ]
    const ctx: NodeRunnerContext = {
      nodeId: 'sw1',
      upstreamOutputs: new Map([['n1', upstream]]),
      resolvedParams: {},
      nodeConfig: { cases },
    }

    const result = await runner.execute(ctx)
    expect(result.output.data?.['matchedBranch']).toBe('big')
  })

  it('evaluates regex_match operator', async () => {
    const upstream: ExecutionResult = { mediaType: 'text', text: 'user-123-admin', durationMs: 0 }
    const cases: SwitchCase[] = [
      { label: 'admin', expression: '', operator: 'regex_match', value: '\\d+-admin$' },
    ]
    const ctx: NodeRunnerContext = {
      nodeId: 'sw1',
      upstreamOutputs: new Map([['n1', upstream]]),
      resolvedParams: {},
      nodeConfig: { cases },
    }

    const result = await runner.execute(ctx)
    expect(result.output.data?.['matchedBranch']).toBe('admin')
  })

  it('handles invalid regex gracefully (no match)', async () => {
    const upstream: ExecutionResult = { mediaType: 'text', text: 'test', durationMs: 0 }
    const cases: SwitchCase[] = [
      { label: 'bad-regex', expression: '', operator: 'regex_match', value: '[invalid' },
    ]
    const ctx: NodeRunnerContext = {
      nodeId: 'sw1',
      upstreamOutputs: new Map([['n1', upstream]]),
      resolvedParams: {},
      nodeConfig: { cases, defaultBranch: 'safe' },
    }

    const result = await runner.execute(ctx)
    expect(result.output.data?.['matchedBranch']).toBe('safe')
  })

  it('evaluates is_empty and is_not_empty', async () => {
    const upstream: ExecutionResult = { mediaType: 'text', text: '', durationMs: 0 }
    const cases: SwitchCase[] = [
      { label: 'has-value', expression: '', operator: 'is_not_empty', value: '' },
      { label: 'empty', expression: '', operator: 'is_empty', value: '' },
    ]
    const ctx: NodeRunnerContext = {
      nodeId: 'sw1',
      upstreamOutputs: new Map([['n1', upstream]]),
      resolvedParams: {},
      nodeConfig: { cases },
    }

    const result = await runner.execute(ctx)
    expect(result.output.data?.['matchedBranch']).toBe('empty')
  })

  it('uses inputPath to extract nested value for comparison', async () => {
    const upstream: ExecutionResult = {
      mediaType: 'text',
      text: '',
      data: { response: { status: 'success', code: 200 } },
      durationMs: 0,
    }
    const cases: SwitchCase[] = [
      { label: 'ok', expression: '', operator: 'equals', value: 'success' },
    ]
    const ctx: NodeRunnerContext = {
      nodeId: 'sw1',
      upstreamOutputs: new Map([['n1', upstream]]),
      resolvedParams: {},
      nodeConfig: { cases, inputPath: 'response.status' },
    }

    const result = await runner.execute(ctx)
    expect(result.output.data?.['matchedBranch']).toBe('ok')
  })

  it('uses case expression for nested field within sourceValue', async () => {
    const upstream: ExecutionResult = {
      mediaType: 'text',
      text: '',
      data: { items: [{ type: 'admin' }, { type: 'user' }] },
      durationMs: 0,
    }
    const cases: SwitchCase[] = [
      { label: 'first-is-admin', expression: 'items[0].type', operator: 'equals', value: 'admin' },
    ]
    const ctx: NodeRunnerContext = {
      nodeId: 'sw1',
      upstreamOutputs: new Map([['n1', upstream]]),
      resolvedParams: {},
      nodeConfig: { cases },
    }

    const result = await runner.execute(ctx)
    expect(result.output.data?.['matchedBranch']).toBe('first-is-admin')
  })
})
