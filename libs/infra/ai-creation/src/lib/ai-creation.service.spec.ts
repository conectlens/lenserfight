import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AICreationService } from './ai-creation.service'
import type { AICreationInput, ProfileAIPreference } from './creation.types'

// ─── Mock callProvider ────────────────────────────────────────────────────────

vi.mock('@lenserfight/providers', () => ({
  callProvider: vi.fn(),
}))

import { callProvider } from '@lenserfight/providers'
const mockCallProvider = vi.mocked(callProvider)

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LOCAL_PREFERENCE: ProfileAIPreference = {
  fundingSource: 'user_byok_local',
  modelId: 'gpt-4o-mini',
  providerId: 'openai',
  selectedKeyRefId: null,
  localKeyId: 'local-key-id',
}

const CLOUD_PREFERENCE: ProfileAIPreference = {
  fundingSource: 'user_byok_cloud',
  modelId: 'gpt-4o-mini',
  providerId: 'openai',
  selectedKeyRefId: 'cloud-key-ref',
  localKeyId: null,
}

function makeLensInput(overrides: Partial<AICreationInput> = {}): AICreationInput {
  return {
    generationType: 'lens',
    prompt: 'Create a summarizer lens',
    profileId: 'user-123',
    context: { userTagSlugs: ['writing'] },
    ...overrides,
  }
}

function makeWorkflowInput(overrides: Partial<AICreationInput> = {}): AICreationInput {
  return {
    generationType: 'workflow',
    prompt: 'Research and draft workflow',
    profileId: 'user-123',
    context: { availableLensIds: ['lens-1', 'lens-2'] },
    ...overrides,
  }
}

const VALID_LENS_JSON = JSON.stringify({
  title: 'Text Summarizer',
  content: '## Summarize\nSummarize the following text in [[num_sentences]] sentences:\n\n[[text]]',
  description: 'Summarizes any text to a target length.',
  suggestedTagSlugs: ['writing', 'productivity'],
  params: [{ label: 'num_sentences' }, { label: 'text' }],
})

const VALID_WORKFLOW_JSON = JSON.stringify({
  title: 'Research & Draft',
  description: 'Researches a topic and drafts content from notes.',
  suggestedLensIds: ['lens-1', 'lens-2'],
})

describe('AICreationService', () => {
  let resolveLocalKey: ReturnType<typeof vi.fn>
  let service: AICreationService

  beforeEach(() => {
    vi.clearAllMocks()
    resolveLocalKey = vi.fn().mockResolvedValue('sk-test-key')
    service = new AICreationService(resolveLocalKey)
  })

  // ─── Input validation ─────────────────────────────────────────────────────

  it('returns VALIDATION_ERROR when profileId is missing', async () => {
    const result = await service.generate(makeLensInput({ profileId: '' }), LOCAL_PREFERENCE)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('VALIDATION_ERROR')
  })

  it('returns PROMPT_TOO_LONG when prompt exceeds MAX_PROMPT_LENGTH', async () => {
    const longPrompt = 'x'.repeat(AICreationService.MAX_PROMPT_LENGTH + 1)
    const result = await service.generate(makeLensInput({ prompt: longPrompt }), LOCAL_PREFERENCE)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('PROMPT_TOO_LONG')
      expect(result.error.maxLength).toBe(AICreationService.MAX_PROMPT_LENGTH)
    }
  })

  // ─── Non-local funding source rejection ───────────────────────────────────

  it('rejects platform_credit with UNAUTHORIZED (server-only path)', async () => {
    const result = await service.generate(makeLensInput(), {
      ...LOCAL_PREFERENCE,
      fundingSource: 'platform_credit',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('UNAUTHORIZED')
  })

  it('rejects user_byok_cloud with UNAUTHORIZED (server-only path)', async () => {
    const result = await service.generate(makeLensInput(), CLOUD_PREFERENCE)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('UNAUTHORIZED')
  })

  // ─── NO_LOCAL_KEY when localKeyId is null ────────────────────────────────

  it('returns NO_LOCAL_KEY when fundingSource=user_byok_local but localKeyId=null', async () => {
    const result = await service.generate(makeLensInput(), { ...LOCAL_PREFERENCE, localKeyId: null })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('NO_LOCAL_KEY')
  })

  // ─── Prompt-based lens generation ─────────────────────────────────────────

  it('generates a lens with valid JSON response (prompted mode)', async () => {
    mockCallProvider.mockResolvedValue({ content: VALID_LENS_JSON, usage: { input_tokens: 100, output_tokens: 200 } })
    const result = await service.generate(makeLensInput(), LOCAL_PREFERENCE)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.mode).toBe('prompted')
      expect(result.output.type).toBe('lens')
      if (result.output.type === 'lens') {
        expect(result.output.result.title).toBe('Text Summarizer')
        expect(result.output.result.params).toHaveLength(2)
      }
    }
  })

  // ─── Promptless lens recommendation ───────────────────────────────────────

  it('generates a lens in recommendation mode when prompt is null', async () => {
    mockCallProvider.mockResolvedValue({ content: VALID_LENS_JSON, usage: { input_tokens: 80, output_tokens: 180 } })
    const result = await service.generate(makeLensInput({ prompt: null }), LOCAL_PREFERENCE)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.mode).toBe('recommendation')
  })

  it('generates a lens in recommendation mode when prompt is empty string', async () => {
    mockCallProvider.mockResolvedValue({ content: VALID_LENS_JSON, usage: { input_tokens: 80, output_tokens: 180 } })
    const result = await service.generate(makeLensInput({ prompt: '' }), LOCAL_PREFERENCE)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.mode).toBe('recommendation')
  })

  it('generates a lens in recommendation mode when prompt is whitespace only', async () => {
    mockCallProvider.mockResolvedValue({ content: VALID_LENS_JSON, usage: { input_tokens: 80, output_tokens: 180 } })
    const result = await service.generate(makeLensInput({ prompt: '   ' }), LOCAL_PREFERENCE)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.mode).toBe('recommendation')
  })

  // ─── Prompt-based workflow generation ─────────────────────────────────────

  it('generates a workflow with valid JSON response (prompted mode)', async () => {
    mockCallProvider.mockResolvedValue({ content: VALID_WORKFLOW_JSON, usage: { input_tokens: 100, output_tokens: 150 } })
    const result = await service.generate(makeWorkflowInput(), LOCAL_PREFERENCE)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.mode).toBe('prompted')
      expect(result.output.type).toBe('workflow')
      if (result.output.type === 'workflow') {
        expect(result.output.result.title).toBe('Research & Draft')
        expect(result.output.result.suggestedLensIds).toContain('lens-1')
      }
    }
  })

  // ─── Promptless workflow recommendation ───────────────────────────────────

  it('recommends a workflow when no prompt is given', async () => {
    mockCallProvider.mockResolvedValue({ content: VALID_WORKFLOW_JSON, usage: { input_tokens: 80, output_tokens: 120 } })
    const result = await service.generate(makeWorkflowInput({ prompt: null }), LOCAL_PREFERENCE)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.mode).toBe('recommendation')
  })

  // ─── Gateway error ────────────────────────────────────────────────────────

  it('returns GATEWAY_ERROR when local key resolver throws', async () => {
    resolveLocalKey.mockRejectedValue(new Error('gateway unreachable'))
    const result = await service.generate(makeLensInput(), LOCAL_PREFERENCE)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('GATEWAY_ERROR')
  })

  // ─── Provider error normalization ─────────────────────────────────────────

  it('returns PROVIDER_ERROR on provider HTTP failure', async () => {
    mockCallProvider.mockRejectedValue(new Error('Provider returned 500'))
    const result = await service.generate(makeLensInput(), LOCAL_PREFERENCE)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('PROVIDER_ERROR')
  })

  it('returns RATE_LIMITED on rate limit error', async () => {
    mockCallProvider.mockRejectedValue(new Error('rate limit exceeded 429'))
    const result = await service.generate(makeLensInput(), LOCAL_PREFERENCE)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('RATE_LIMITED')
  })

  it('returns CREDIT_EXHAUSTED on quota error', async () => {
    mockCallProvider.mockRejectedValue(new Error('insufficient_quota'))
    const result = await service.generate(makeLensInput(), LOCAL_PREFERENCE)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('CREDIT_EXHAUSTED')
  })

  // ─── Timeout ─────────────────────────────────────────────────────────────

  it('returns TIMEOUT on AbortError', async () => {
    const abortError = new Error('The operation was aborted')
    abortError.name = 'AbortError'
    mockCallProvider.mockRejectedValue(abortError)
    const result = await service.generate(makeLensInput(), LOCAL_PREFERENCE)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('TIMEOUT')
  })

  // ─── Parse error ─────────────────────────────────────────────────────────

  it('returns PARSE_ERROR when provider returns non-JSON prose', async () => {
    mockCallProvider.mockResolvedValue({ content: 'I cannot help with that request.', usage: { input_tokens: 10, output_tokens: 10 } })
    const result = await service.generate(makeLensInput(), LOCAL_PREFERENCE)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('PARSE_ERROR')
  })

  // ─── No unbounded retry ───────────────────────────────────────────────────

  it('does not retry — callProvider is called exactly once on failure', async () => {
    mockCallProvider.mockRejectedValue(new Error('Provider error'))
    await service.generate(makeLensInput(), LOCAL_PREFERENCE)
    expect(mockCallProvider).toHaveBeenCalledTimes(1)
  })
})
