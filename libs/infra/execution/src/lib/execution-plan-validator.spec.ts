import { validateBrowserExecutionPlan } from './execution-plan-validator'

const models = [
  { key: 'gpt-4o', provider: 'openai' },
  { key: 'claude-sonnet-4-6', provider: 'anthropic' },
  { key: 'fal-ai/flux/dev', provider: 'fal-ai' },
]

describe('validateBrowserExecutionPlan', () => {
  it('accepts text-only graph under platform_credit', () => {
    const r = validateBrowserExecutionPlan(
      [{ id: 'a', config: {} }],
      'gpt-4o',
      models,
      'platform_credit',
    )
    expect(r.ok).toBe(true)
    expect(r.errors).toHaveLength(0)
  })

  it('rejects fal model when funding is user_byok_cloud', () => {
    const r = validateBrowserExecutionPlan(
      [{ id: 'img', config: { model_id: 'fal-ai/flux/dev' } }],
      'gpt-4o',
      models,
      'user_byok_cloud',
    )
    expect(r.ok).toBe(false)
    expect(r.errors.some((e) => e.code === 'unsupported_provider')).toBe(true)
  })

  it('allows fal under platform_credit', () => {
    const r = validateBrowserExecutionPlan(
      [{ id: 'img', config: { model_id: 'fal-ai/flux/dev' } }],
      'gpt-4o',
      models,
      'platform_credit',
    )
    expect(r.ok).toBe(true)
  })

  it('reports unknown_model for missing model key', () => {
    const r = validateBrowserExecutionPlan(
      [{ id: 'x', config: { model_id: 'no-such-model' } }],
      'gpt-4o',
      models,
      'platform_credit',
    )
    expect(r.ok).toBe(false)
    expect(r.errors.some((e) => e.code === 'unknown_model')).toBe(true)
  })
})
