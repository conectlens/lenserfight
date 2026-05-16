import { describe, it, expect } from 'vitest'
import { OutputParserRunner } from './output-parser.runner'
import type { NodeRunnerContext } from './node-runner.interface'
import type { ExecutionResult } from '../execution.types'

describe('OutputParserRunner', () => {
  const runner = new OutputParserRunner()

  it('declares node type as output_parser', () => {
    expect(runner.nodeType).toBe('output_parser')
  })

  it('returns error when no upstream text', async () => {
    const ctx: NodeRunnerContext = { nodeId: 'op1', upstreamOutputs: new Map(), resolvedParams: {}, nodeConfig: {} }
    const result = await runner.execute(ctx)
    expect(result.output.data?.['parseError']).toBe(true)
  })

  it('parses plain JSON object from upstream', async () => {
    const upstream: ExecutionResult = { mediaType: 'text', text: '{"name":"Alice","age":30}', durationMs: 0 }
    const ctx: NodeRunnerContext = {
      nodeId: 'op1', upstreamOutputs: new Map([['n1', upstream]]),
      resolvedParams: {}, nodeConfig: {},
    }
    const result = await runner.execute(ctx)
    expect(result.output.data?.['name']).toBe('Alice')
    expect(result.output.data?.['age']).toBe(30)
    expect(result.output.data?.['__parsed']).toBe(true)
  })

  it('extracts JSON from markdown code fence', async () => {
    const text = 'Here is the result:\n```json\n{"status":"ok"}\n```\nDone.'
    const upstream: ExecutionResult = { mediaType: 'text', text, durationMs: 0 }
    const ctx: NodeRunnerContext = {
      nodeId: 'op1', upstreamOutputs: new Map([['n1', upstream]]),
      resolvedParams: {}, nodeConfig: {},
    }
    const result = await runner.execute(ctx)
    expect(result.output.data?.['status']).toBe('ok')
  })

  it('extracts first JSON object from mixed text', async () => {
    const text = 'The answer is {"result": 42} and more text.'
    const upstream: ExecutionResult = { mediaType: 'text', text, durationMs: 0 }
    const ctx: NodeRunnerContext = {
      nodeId: 'op1', upstreamOutputs: new Map([['n1', upstream]]),
      resolvedParams: {}, nodeConfig: {},
    }
    const result = await runner.execute(ctx)
    expect(result.output.data?.['result']).toBe(42)
  })

  it('extracts specific fields when configured', async () => {
    const upstream: ExecutionResult = { mediaType: 'text', text: '{"name":"Bob","age":25,"city":"NYC"}', durationMs: 0 }
    const ctx: NodeRunnerContext = {
      nodeId: 'op1', upstreamOutputs: new Map([['n1', upstream]]),
      resolvedParams: {}, nodeConfig: { fields: ['name', 'city'] },
    }
    const result = await runner.execute(ctx)
    expect(result.output.data?.['name']).toBe('Bob')
    expect(result.output.data?.['city']).toBe('NYC')
    expect(result.output.data?.['age']).toBeUndefined()
  })

  it('reports missing fields in non-strict mode', async () => {
    const upstream: ExecutionResult = { mediaType: 'text', text: '{"name":"Bob"}', durationMs: 0 }
    const ctx: NodeRunnerContext = {
      nodeId: 'op1', upstreamOutputs: new Map([['n1', upstream]]),
      resolvedParams: {}, nodeConfig: { fields: ['name', 'missing_field'] },
    }
    const result = await runner.execute(ctx)
    expect(result.output.data?.['name']).toBe('Bob')
    expect(result.output.data?.['__missing']).toEqual(['missing_field'])
  })

  it('fails in strict mode when fields are missing', async () => {
    const upstream: ExecutionResult = { mediaType: 'text', text: '{"name":"Bob"}', durationMs: 0 }
    const ctx: NodeRunnerContext = {
      nodeId: 'op1', upstreamOutputs: new Map([['n1', upstream]]),
      resolvedParams: {}, nodeConfig: { fields: ['name', 'required_field'], strict: true },
    }
    const result = await runner.execute(ctx)
    expect(result.output.data?.['parseError']).toBe(true)
    expect(result.output.data?.['missing']).toEqual(['required_field'])
  })

  it('applies jsonPath to extract nested object', async () => {
    const upstream: ExecutionResult = { mediaType: 'text', text: '{"response":{"data":{"count":5}}}', durationMs: 0 }
    const ctx: NodeRunnerContext = {
      nodeId: 'op1', upstreamOutputs: new Map([['n1', upstream]]),
      resolvedParams: {}, nodeConfig: { jsonPath: 'response.data' },
    }
    const result = await runner.execute(ctx)
    expect(result.output.data?.['count']).toBe(5)
  })

  it('handles JSON array', async () => {
    const upstream: ExecutionResult = { mediaType: 'text', text: '[1,2,3]', durationMs: 0 }
    const ctx: NodeRunnerContext = {
      nodeId: 'op1', upstreamOutputs: new Map([['n1', upstream]]),
      resolvedParams: {}, nodeConfig: {},
    }
    const result = await runner.execute(ctx)
    expect(result.output.data?.['value']).toEqual([1, 2, 3])
  })

  it('returns parseError when no JSON found', async () => {
    const upstream: ExecutionResult = { mediaType: 'text', text: 'Just plain text with no JSON', durationMs: 0 }
    const ctx: NodeRunnerContext = {
      nodeId: 'op1', upstreamOutputs: new Map([['n1', upstream]]),
      resolvedParams: {}, nodeConfig: {},
    }
    const result = await runner.execute(ctx)
    expect(result.output.data?.['parseError']).toBe(true)
  })
})
