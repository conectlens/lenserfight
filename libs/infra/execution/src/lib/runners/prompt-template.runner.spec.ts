import { describe, it, expect } from 'vitest'
import { PromptTemplateRunner } from './prompt-template.runner'
import type { NodeRunnerContext } from './node-runner.interface'
import type { ExecutionResult } from '../execution.types'

describe('PromptTemplateRunner', () => {
  const runner = new PromptTemplateRunner()

  it('declares node type as prompt_template', () => {
    expect(runner.nodeType).toBe('prompt_template')
  })

  it('returns error when no template configured', async () => {
    const ctx: NodeRunnerContext = { nodeId: 'pt1', upstreamOutputs: new Map(), resolvedParams: {}, nodeConfig: {} }
    const result = await runner.execute(ctx)
    expect(result.output.data?.['error']).toContain('No template')
  })

  it('renders static template without variables', async () => {
    const ctx: NodeRunnerContext = {
      nodeId: 'pt1', upstreamOutputs: new Map(), resolvedParams: {},
      nodeConfig: { template: 'Hello world' },
    }
    const result = await runner.execute(ctx)
    expect(result.output.text).toBe('Hello world')
  })

  it('interpolates variables from resolvedParams', async () => {
    const ctx: NodeRunnerContext = {
      nodeId: 'pt1', upstreamOutputs: new Map(),
      resolvedParams: { name: 'Alice', topic: 'AI' },
      nodeConfig: { template: 'Write about {{topic}} for {{name}}' },
    }
    const result = await runner.execute(ctx)
    expect(result.output.text).toBe('Write about AI for Alice')
  })

  it('interpolates upstream text output via nodeId', async () => {
    const upstream: ExecutionResult = { mediaType: 'text', text: 'upstream content', durationMs: 0 }
    const ctx: NodeRunnerContext = {
      nodeId: 'pt1', upstreamOutputs: new Map([['n1', upstream]]),
      resolvedParams: {},
      nodeConfig: { template: 'Context: {{n1}}' },
    }
    const result = await runner.execute(ctx)
    expect(result.output.text).toBe('Context: upstream content')
  })

  it('interpolates upstream data fields', async () => {
    const upstream: ExecutionResult = { mediaType: 'text', text: '', data: { summary: 'brief' }, durationMs: 0 }
    const ctx: NodeRunnerContext = {
      nodeId: 'pt1', upstreamOutputs: new Map([['n1', upstream]]),
      resolvedParams: {},
      nodeConfig: { template: 'Summary: {{n1.summary}}' },
    }
    const result = await runner.execute(ctx)
    expect(result.output.text).toBe('Summary: brief')
  })

  it('renders empty string for missing variables', async () => {
    const ctx: NodeRunnerContext = {
      nodeId: 'pt1', upstreamOutputs: new Map(), resolvedParams: {},
      nodeConfig: { template: 'Hello {{missing}}!' },
    }
    const result = await runner.execute(ctx)
    expect(result.output.text).toBe('Hello !')
  })

  it('serializes object variables as JSON', async () => {
    const ctx: NodeRunnerContext = {
      nodeId: 'pt1', upstreamOutputs: new Map(),
      resolvedParams: { items: [1, 2, 3] },
      nodeConfig: { template: 'Data: {{items}}' },
    }
    const result = await runner.execute(ctx)
    expect(result.output.text).toBe('Data: [1,2,3]')
  })

  it('uses explicit variable mappings', async () => {
    const upstream: ExecutionResult = { mediaType: 'text', text: '', data: { user: { name: 'Bob' } }, durationMs: 0 }
    const ctx: NodeRunnerContext = {
      nodeId: 'pt1', upstreamOutputs: new Map([['n1', upstream]]),
      resolvedParams: {},
      nodeConfig: {
        template: 'Hello {{userName}}',
        variables: { userName: 'n1.user.name' },
      },
    }
    const result = await runner.execute(ctx)
    expect(result.output.text).toBe('Hello Bob')
  })

  it('reports variable count in output data', async () => {
    const ctx: NodeRunnerContext = {
      nodeId: 'pt1', upstreamOutputs: new Map(),
      resolvedParams: { a: '1', b: '2' },
      nodeConfig: { template: '{{a}} + {{b}} = {{c}}' },
    }
    const result = await runner.execute(ctx)
    expect(result.output.data?.['variableCount']).toBe(3)
  })

  it('rejects template exceeding max length', async () => {
    const ctx: NodeRunnerContext = {
      nodeId: 'pt1', upstreamOutputs: new Map(), resolvedParams: {},
      nodeConfig: { template: 'x'.repeat(50_001) },
    }
    const result = await runner.execute(ctx)
    expect(result.output.data?.['error']).toContain('exceeds maximum length')
  })
})
