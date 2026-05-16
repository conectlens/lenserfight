import { describe, it, expect } from 'vitest'
import { FormInputTriggerRunner } from './form-input-trigger.runner'
import type { NodeRunnerContext } from '../node-runner.interface'

function makeCtx(overrides: Partial<NodeRunnerContext> = {}): NodeRunnerContext {
  return {
    nodeId: 'n1',
    upstreamOutputs: new Map(),
    resolvedParams: {},
    nodeConfig: {},
    ...overrides,
  }
}

describe('FormInputTriggerRunner', () => {
  const runner = new FormInputTriggerRunner()

  it('has nodeType form_input_trigger', () => {
    expect(runner.nodeType).toBe('form_input_trigger')
  })

  it('extracts defined fields from resolvedParams', async () => {
    const ctx = makeCtx({
      nodeConfig: {
        fields: [
          { name: 'prompt', type: 'text', required: true, label: 'Your question' },
          { name: 'language', type: 'text', required: false, label: 'Language' },
        ],
      },
      resolvedParams: { prompt: 'What is AI?', language: 'en', unrelated: 'ignored' },
    })

    const result = await runner.execute(ctx)
    const formData = (result.output.data as Record<string, unknown>)['formData'] as Record<string, unknown>

    expect(formData['prompt']).toBe('What is AI?')
    expect(formData['language']).toBe('en')
    expect(formData['unrelated']).toBeUndefined()
  })

  it('throws when a required field is missing', async () => {
    const ctx = makeCtx({
      nodeConfig: {
        fields: [{ name: 'topic', type: 'text', required: true, label: 'Topic' }],
      },
      resolvedParams: {},
    })

    await expect(runner.execute(ctx)).rejects.toThrow(/Topic/)
  })

  it('silently omits optional fields that are not provided', async () => {
    const ctx = makeCtx({
      nodeConfig: {
        fields: [
          { name: 'required_field', type: 'text', required: true },
          { name: 'optional_field', type: 'text', required: false },
        ],
      },
      resolvedParams: { required_field: 'hello' },
    })

    const result = await runner.execute(ctx)
    const formData = (result.output.data as Record<string, unknown>)['formData'] as Record<string, unknown>

    expect(formData['required_field']).toBe('hello')
    expect('optional_field' in formData).toBe(false)
  })

  it('returns empty formData when nodeConfig.fields is not set', async () => {
    const ctx = makeCtx({ resolvedParams: { foo: 'bar' } })

    const result = await runner.execute(ctx)
    const formData = (result.output.data as Record<string, unknown>)['formData']

    expect(formData).toEqual({})
  })

  it('does not emit variableMutations', async () => {
    const result = await runner.execute(makeCtx())
    expect(result.variableMutations).toBeUndefined()
  })
})
