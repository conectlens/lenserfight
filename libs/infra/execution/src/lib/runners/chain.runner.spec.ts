import { describe, it, expect } from 'vitest'
import { ChainRunner } from './chain.runner'
import type { NodeRunnerContext } from './node-runner.interface'
import type { ExecutionResult } from '../execution.types'

describe('ChainRunner', () => {
  const runner = new ChainRunner()

  it('declares node type as chain', () => { expect(runner.nodeType).toBe('chain') })

  it('builds empty chain with no inputs', async () => {
    const ctx: NodeRunnerContext = { nodeId: 'ch1', upstreamOutputs: new Map(), resolvedParams: {}, nodeConfig: {} }
    const result = await runner.execute(ctx)
    expect(result.output.data?.['__chain_context']).toBe(true)
    expect(result.output.data?.['messageCount']).toBe(0)
  })

  it('includes system prompt when configured', async () => {
    const ctx: NodeRunnerContext = {
      nodeId: 'ch1', upstreamOutputs: new Map(),
      resolvedParams: {}, nodeConfig: { systemPrompt: 'You are a helpful assistant' },
    }
    const result = await runner.execute(ctx)
    const messages = result.output.data?.['messages'] as Array<{ role: string; content: string }>
    expect(messages[0].role).toBe('system')
    expect(messages[0].content).toBe('You are a helpful assistant')
  })

  it('adds upstream outputs as assistant messages', async () => {
    const a: ExecutionResult = { mediaType: 'text', text: 'First response', durationMs: 0 }
    const b: ExecutionResult = { mediaType: 'text', text: 'Second response', durationMs: 0 }
    const ctx: NodeRunnerContext = {
      nodeId: 'ch1', upstreamOutputs: new Map([['n1', a], ['n2', b]]),
      resolvedParams: {}, nodeConfig: {},
    }
    const result = await runner.execute(ctx)
    const messages = result.output.data?.['messages'] as Array<{ role: string; content: string }>
    expect(messages).toHaveLength(2)
    expect(messages[0].role).toBe('assistant')
    expect(messages[1].role).toBe('assistant')
  })

  it('preserves existing chain history from resolvedParams', async () => {
    const existingHistory = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there' },
    ]
    const ctx: NodeRunnerContext = {
      nodeId: 'ch1', upstreamOutputs: new Map(),
      resolvedParams: { __chain_messages: existingHistory },
      nodeConfig: {},
    }
    const result = await runner.execute(ctx)
    const messages = result.output.data?.['messages'] as Array<{ role: string; content: string }>
    expect(messages).toHaveLength(2)
    expect(messages[0].content).toBe('Hello')
    expect(messages[1].content).toBe('Hi there')
  })

  it('trims messages to maxTurns keeping system prompt', async () => {
    const history = Array.from({ length: 30 }, (_, i) => ({ role: 'user' as const, content: `msg-${i}` }))
    const ctx: NodeRunnerContext = {
      nodeId: 'ch1', upstreamOutputs: new Map(),
      resolvedParams: { __chain_messages: history },
      nodeConfig: { systemPrompt: 'System', maxTurns: 5 },
    }
    const result = await runner.execute(ctx)
    const messages = result.output.data?.['messages'] as Array<{ role: string }>
    // 1 system + 5 trimmed
    expect(messages).toHaveLength(6)
    expect(messages[0].role).toBe('system')
  })

  it('respects includeUpstream=false', async () => {
    const upstream: ExecutionResult = { mediaType: 'text', text: 'Should not appear', durationMs: 0 }
    const ctx: NodeRunnerContext = {
      nodeId: 'ch1', upstreamOutputs: new Map([['n1', upstream]]),
      resolvedParams: {}, nodeConfig: { includeUpstream: false },
    }
    const result = await runner.execute(ctx)
    expect(result.output.data?.['messageCount']).toBe(0)
  })

  it('caps maxTurns at 50', async () => {
    const ctx: NodeRunnerContext = {
      nodeId: 'ch1', upstreamOutputs: new Map(),
      resolvedParams: {}, nodeConfig: { maxTurns: 999 },
    }
    const result = await runner.execute(ctx)
    expect(result.output.data?.['maxTurns']).toBe(50)
  })

  it('sets chain messages in variableMutations for downstream', async () => {
    const upstream: ExecutionResult = { mediaType: 'text', text: 'Hello', durationMs: 0 }
    const ctx: NodeRunnerContext = {
      nodeId: 'ch1', upstreamOutputs: new Map([['n1', upstream]]),
      resolvedParams: {}, nodeConfig: { systemPrompt: 'Be helpful' },
    }
    const result = await runner.execute(ctx)
    const mutatedMessages = result.variableMutations?.['__chain_messages'] as unknown[]
    expect(mutatedMessages).toHaveLength(2)
    expect(result.variableMutations?.['__chain_turn_count']).toBe(2)
  })

  it('renders combined text output with role labels', async () => {
    const upstream: ExecutionResult = { mediaType: 'text', text: 'Response', durationMs: 0 }
    const ctx: NodeRunnerContext = {
      nodeId: 'ch1', upstreamOutputs: new Map([['n1', upstream]]),
      resolvedParams: {}, nodeConfig: { systemPrompt: 'System msg' },
    }
    const result = await runner.execute(ctx)
    expect(result.output.text).toContain('[system] System msg')
    expect(result.output.text).toContain('[assistant] Response')
  })
})
