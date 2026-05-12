import { describe, expect, it, vi } from 'vitest'
import {
  hashPrompt,
  jsonShapeAssertion,
  runModelConformanceTest,
} from './modelTestHarness'

describe('modelTestHarness', () => {
  it('hashPrompt produces stable sha256', () => {
    expect(hashPrompt('hello')).toBe(hashPrompt('hello'))
    expect(hashPrompt('hello')).toMatch(/^sha256:[0-9a-f]{64}$/)
  })

  it('passes when assertion returns true', async () => {
    const runner = vi.fn().mockResolvedValue({ raw: { ok: true }, text: '{"ok":true}' })
    const out = await runModelConformanceTest(
      'openai',
      'gpt-4o-mini',
      'prompt',
      () => true,
      runner,
    )
    expect(out.passed).toBe(true)
    expect(out.violations).toEqual([])
    expect(runner).toHaveBeenCalledOnce()
  })

  it('captures schema violations', async () => {
    const runner = vi.fn().mockResolvedValue({ raw: {}, text: '{"only":1}' })
    const out = await runModelConformanceTest(
      'openai',
      'gpt-4o-mini',
      'prompt',
      jsonShapeAssertion(['title', 'body']),
      runner,
    )
    expect(out.passed).toBe(false)
    expect(out.violations).toEqual(['missing_key:title', 'missing_key:body'])
  })

  it('flags invalid JSON', async () => {
    const runner = vi.fn().mockResolvedValue({ raw: 'not json', text: 'not json' })
    const out = await runModelConformanceTest(
      'openai',
      'gpt-4o-mini',
      'prompt',
      jsonShapeAssertion(['x']),
      runner,
    )
    expect(out.passed).toBe(false)
    expect(out.violations).toEqual(['invalid_json'])
  })

  it('captures runner errors as runner_error violations', async () => {
    const runner = vi.fn().mockRejectedValue(new Error('timeout'))
    const out = await runModelConformanceTest(
      'openai',
      'gpt-4o-mini',
      'prompt',
      () => true,
      runner,
    )
    expect(out.passed).toBe(false)
    expect(out.violations[0]).toMatch(/^runner_error: timeout/)
  })
})
