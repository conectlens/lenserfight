import { describe, it, expect } from 'vitest'
import { RagRetrievalRunner } from './rag-retrieval.runner'
import type { NodeRunnerContext } from './node-runner.interface'
import type { ExecutionResult } from '../execution.types'

describe('RagRetrievalRunner', () => {
  const runner = new RagRetrievalRunner()

  it('declares node type as rag_retrieval', () => { expect(runner.nodeType).toBe('rag_retrieval') })

  it('returns error when no query available', async () => {
    const ctx: NodeRunnerContext = { nodeId: 'r1', upstreamOutputs: new Map(), resolvedParams: {}, nodeConfig: {} }
    const result = await runner.execute(ctx)
    expect(result.output.data?.['error']).toContain('No query')
  })

  it('uses upstream text as query by default', async () => {
    const upstream: ExecutionResult = { mediaType: 'text', text: 'What is AI?', durationMs: 0 }
    const ctx: NodeRunnerContext = {
      nodeId: 'r1', upstreamOutputs: new Map([['n1', upstream]]),
      resolvedParams: {}, nodeConfig: {},
    }
    const result = await runner.execute(ctx)
    expect(result.output.data?.['__rag_retrieval_request']).toBe(true)
    expect(result.output.data?.['query']).toBe('What is AI?')
    expect(result.output.data?.['topK']).toBe(5)
  })

  it('uses explicit query from config', async () => {
    const ctx: NodeRunnerContext = {
      nodeId: 'r1', upstreamOutputs: new Map(),
      resolvedParams: {}, nodeConfig: { query: 'Custom search' },
    }
    const result = await runner.execute(ctx)
    expect(result.output.data?.['query']).toBe('Custom search')
  })

  it('respects topK config capped at 20', async () => {
    const upstream: ExecutionResult = { mediaType: 'text', text: 'query', durationMs: 0 }
    const ctx: NodeRunnerContext = {
      nodeId: 'r1', upstreamOutputs: new Map([['n1', upstream]]),
      resolvedParams: {}, nodeConfig: { topK: 50 },
    }
    const result = await runner.execute(ctx)
    expect(result.output.data?.['topK']).toBe(20)
  })

  it('passes lenserId and minScore', async () => {
    const upstream: ExecutionResult = { mediaType: 'text', text: 'q', durationMs: 0 }
    const ctx: NodeRunnerContext = {
      nodeId: 'r1', upstreamOutputs: new Map([['n1', upstream]]),
      resolvedParams: {}, nodeConfig: { lenserId: 'abc-123', minScore: 0.7 },
    }
    const result = await runner.execute(ctx)
    expect(result.output.data?.['lenserId']).toBe('abc-123')
    expect(result.output.data?.['minScore']).toBe(0.7)
  })

  it('sets retrieval metadata in variableMutations', async () => {
    const upstream: ExecutionResult = { mediaType: 'text', text: 'search term', durationMs: 0 }
    const ctx: NodeRunnerContext = {
      nodeId: 'r1', upstreamOutputs: new Map([['n1', upstream]]),
      resolvedParams: {}, nodeConfig: {},
    }
    const result = await runner.execute(ctx)
    expect(result.variableMutations?.['__rag_query']).toBe('search term')
    expect(result.variableMutations?.['__rag_top_k']).toBe(5)
  })
})
