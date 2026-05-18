import { describe, it, expect } from 'vitest'
import { EmbeddingRunner } from './embedding.runner'
import type { NodeRunnerContext } from './node-runner.interface'
import type { ExecutionResult } from '../execution.types'

describe('EmbeddingRunner', () => {
  const runner = new EmbeddingRunner()

  it('declares node type as embedding', () => { expect(runner.nodeType).toBe('embedding') })

  it('returns error when no upstream text', async () => {
    const ctx: NodeRunnerContext = { nodeId: 'e1', upstreamOutputs: new Map(), resolvedParams: {}, nodeConfig: {} }
    const result = await runner.execute(ctx)
    expect(result.output.data?.['error']).toContain('No text')
  })

  it('prepares embedding request from upstream text', async () => {
    const upstream: ExecutionResult = { mediaType: 'text', text: 'Hello world', durationMs: 0 }
    const ctx: NodeRunnerContext = {
      nodeId: 'e1', upstreamOutputs: new Map([['n1', upstream]]),
      resolvedParams: {}, nodeConfig: {},
    }
    const result = await runner.execute(ctx)
    expect(result.output.data?.['__embedding_request']).toBe(true)
    expect(result.output.data?.['textToEmbed']).toBe('Hello world')
    expect(result.output.data?.['textLength']).toBe(11)
  })

  it('extracts text from data field via inputField config', async () => {
    const upstream: ExecutionResult = { mediaType: 'text', text: '', data: { article: { body: 'Deep content' } }, durationMs: 0 }
    const ctx: NodeRunnerContext = {
      nodeId: 'e1', upstreamOutputs: new Map([['n1', upstream]]),
      resolvedParams: {}, nodeConfig: { inputField: 'article.body' },
    }
    const result = await runner.execute(ctx)
    expect(result.output.data?.['textToEmbed']).toBe('Deep content')
  })

  it('passes dimensions config', async () => {
    const upstream: ExecutionResult = { mediaType: 'text', text: 'text', durationMs: 0 }
    const ctx: NodeRunnerContext = {
      nodeId: 'e1', upstreamOutputs: new Map([['n1', upstream]]),
      resolvedParams: {}, nodeConfig: { dimensions: 1536 },
    }
    const result = await runner.execute(ctx)
    expect(result.output.data?.['dimensions']).toBe(1536)
  })

  it('truncates text exceeding max length', async () => {
    const longText = 'x'.repeat(200_000)
    const upstream: ExecutionResult = { mediaType: 'text', text: longText, durationMs: 0 }
    const ctx: NodeRunnerContext = {
      nodeId: 'e1', upstreamOutputs: new Map([['n1', upstream]]),
      resolvedParams: {}, nodeConfig: {},
    }
    const result = await runner.execute(ctx)
    expect(result.output.data?.['textLength']).toBe(100_000)
  })

  it('sets embedding text in variableMutations', async () => {
    const upstream: ExecutionResult = { mediaType: 'text', text: 'embed me', durationMs: 0 }
    const ctx: NodeRunnerContext = {
      nodeId: 'e1', upstreamOutputs: new Map([['n1', upstream]]),
      resolvedParams: {}, nodeConfig: {},
    }
    const result = await runner.execute(ctx)
    expect(result.variableMutations?.['__embedding_text']).toBe('embed me')
  })
})
