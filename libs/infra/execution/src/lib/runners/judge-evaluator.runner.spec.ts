import { describe, it, expect } from 'vitest'
import { JudgeEvaluatorRunner } from './judge-evaluator.runner'
import type { NodeRunnerContext } from './node-runner.interface'
import type { ExecutionResult } from '../execution.types'

describe('JudgeEvaluatorRunner', () => {
  const runner = new JudgeEvaluatorRunner()

  it('declares node type as judge_evaluator', () => {
    expect(runner.nodeType).toBe('judge_evaluator')
  })

  it('returns error when no upstream entries', async () => {
    const ctx: NodeRunnerContext = { nodeId: 'j1', upstreamOutputs: new Map(), resolvedParams: {}, nodeConfig: {} }
    const result = await runner.execute(ctx)
    expect(result.output.data?.['error']).toContain('No entries')
  })

  it('builds judge prompt from two upstream outputs', async () => {
    const a: ExecutionResult = { mediaType: 'text', text: 'Response A content', durationMs: 0 }
    const b: ExecutionResult = { mediaType: 'text', text: 'Response B content', durationMs: 0 }
    const ctx: NodeRunnerContext = {
      nodeId: 'j1', upstreamOutputs: new Map([['lensA', a], ['lensB', b]]),
      resolvedParams: {}, nodeConfig: { rubric: 'Judge creativity and depth' },
    }
    const result = await runner.execute(ctx)
    expect(result.output.text).toContain('Response A content')
    expect(result.output.text).toContain('Response B content')
    expect(result.output.text).toContain('Judge creativity and depth')
    expect(result.output.text).toContain('"winner"')
    expect(result.output.data?.['__judge_evaluation']).toBe(true)
    expect(result.output.data?.['entryCount']).toBe(2)
  })

  it('uses default rubric when not configured', async () => {
    const a: ExecutionResult = { mediaType: 'text', text: 'A', durationMs: 0 }
    const ctx: NodeRunnerContext = {
      nodeId: 'j1', upstreamOutputs: new Map([['n1', a]]),
      resolvedParams: {}, nodeConfig: {},
    }
    const result = await runner.execute(ctx)
    expect(result.output.data?.['rubric']).toContain('quality')
  })

  it('respects sourceNodeIds to select specific entries', async () => {
    const a: ExecutionResult = { mediaType: 'text', text: 'A', durationMs: 0 }
    const b: ExecutionResult = { mediaType: 'text', text: 'B', durationMs: 0 }
    const c: ExecutionResult = { mediaType: 'text', text: 'C', durationMs: 0 }
    const ctx: NodeRunnerContext = {
      nodeId: 'j1', upstreamOutputs: new Map([['n1', a], ['n2', b], ['n3', c]]),
      resolvedParams: {}, nodeConfig: { sourceNodeIds: ['n1', 'n3'] },
    }
    const result = await runner.execute(ctx)
    expect(result.output.text).toContain('A')
    expect(result.output.text).toContain('C')
    expect(result.output.text).not.toContain('Entry 3')
    expect(result.output.data?.['entryCount']).toBe(2)
  })

  it('limits pairwise mode to 2 entries', async () => {
    const a: ExecutionResult = { mediaType: 'text', text: 'A', durationMs: 0 }
    const b: ExecutionResult = { mediaType: 'text', text: 'B', durationMs: 0 }
    const c: ExecutionResult = { mediaType: 'text', text: 'C', durationMs: 0 }
    const ctx: NodeRunnerContext = {
      nodeId: 'j1', upstreamOutputs: new Map([['n1', a], ['n2', b], ['n3', c]]),
      resolvedParams: {}, nodeConfig: { comparisonMode: 'pairwise' },
    }
    const result = await runner.execute(ctx)
    expect(result.output.data?.['entryCount']).toBe(2)
  })

  it('absolute mode includes all entries', async () => {
    const a: ExecutionResult = { mediaType: 'text', text: 'A', durationMs: 0 }
    const b: ExecutionResult = { mediaType: 'text', text: 'B', durationMs: 0 }
    const c: ExecutionResult = { mediaType: 'text', text: 'C', durationMs: 0 }
    const ctx: NodeRunnerContext = {
      nodeId: 'j1', upstreamOutputs: new Map([['n1', a], ['n2', b], ['n3', c]]),
      resolvedParams: {}, nodeConfig: { comparisonMode: 'absolute' },
    }
    const result = await runner.execute(ctx)
    expect(result.output.data?.['entryCount']).toBe(3)
  })

  it('sets custom maxScore in prompt', async () => {
    const a: ExecutionResult = { mediaType: 'text', text: 'A', durationMs: 0 }
    const ctx: NodeRunnerContext = {
      nodeId: 'j1', upstreamOutputs: new Map([['n1', a]]),
      resolvedParams: {}, nodeConfig: { maxScore: 5 },
    }
    const result = await runner.execute(ctx)
    expect(result.output.text).toContain('0 to 5')
    expect(result.output.data?.['maxScore']).toBe(5)
  })

  it('caps maxScore at 100', async () => {
    const a: ExecutionResult = { mediaType: 'text', text: 'A', durationMs: 0 }
    const ctx: NodeRunnerContext = {
      nodeId: 'j1', upstreamOutputs: new Map([['n1', a]]),
      resolvedParams: {}, nodeConfig: { maxScore: 999 },
    }
    const result = await runner.execute(ctx)
    expect(result.output.data?.['maxScore']).toBe(100)
  })

  it('sets judge metadata in variableMutations', async () => {
    const a: ExecutionResult = { mediaType: 'text', text: 'A', durationMs: 0 }
    const ctx: NodeRunnerContext = {
      nodeId: 'j1', upstreamOutputs: new Map([['n1', a]]),
      resolvedParams: {}, nodeConfig: { rubric: 'Test rubric' },
    }
    const result = await runner.execute(ctx)
    expect(result.variableMutations?.['__judge_rubric']).toBe('Test rubric')
    expect(result.variableMutations?.['__judge_entry_count']).toBe(1)
  })

  it('handles data-only upstream (no text)', async () => {
    const a: ExecutionResult = { mediaType: 'text', data: { summary: 'Data only' }, durationMs: 0 }
    const ctx: NodeRunnerContext = {
      nodeId: 'j1', upstreamOutputs: new Map([['n1', a]]),
      resolvedParams: {}, nodeConfig: {},
    }
    const result = await runner.execute(ctx)
    expect(result.output.text).toContain('summary')
  })
})
