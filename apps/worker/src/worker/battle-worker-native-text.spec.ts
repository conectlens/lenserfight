// battle-worker-native-text.spec.ts
//
// Tests for the native (non-Chainabit) text execution path in processNextBattleJob.
//
// Covers the cases missing from battle-worker.spec.ts (Chainabit) and
// battle-worker-media.spec.ts (media modalities):
//   1. Text success — no personality, no lens template
//   2. Personality note injected as system message (personality_note set)
//   3. Personality lens template rendered via RPC (personality_version_id set)
//   4. Lens template rendered via fn_worker_render_template (version_id set)
//   5. BYOK key decryption via fn_worker_decrypt_api_key
//   6. Retry on provider error (retry_count < MAX_RETRIES - 1)
//   7. DLQ on max retries (retry_count >= MAX_RETRIES - 1)

const mockCallProvider        = jest.fn()
const mockCallGenerativeMedia = jest.fn()
const mockModelKind           = jest.fn().mockReturnValue(null) // default: text path

const mockRpc = jest.fn()

jest.mock('@lenserfight/providers', () => ({
  callProvider:        (...args: unknown[]) => mockCallProvider(...args),
  callGenerativeMedia: (...args: unknown[]) => mockCallGenerativeMedia(...args),
  modelKind:           (key: string)        => mockModelKind(key),
  byokKeyResolver:     { resolve: jest.fn().mockReturnValue('resolved-env-key') },
}))

jest.mock('@lenserfight/data/repositories', () => ({
  chainabitExecutionRepository: {
    submitBattleJob: jest.fn(),
    pollBattleJob:   jest.fn(),
  },
}))

jest.mock('../lib/supabase', () => ({
  createServiceSupabaseClient: jest.fn(() => ({ rpc: mockRpc })),
}))

// Ensure the direct (non-Chainabit) path is exercised.
process.env['CHAINABIT_EXECUTION_ENABLED'] = 'false'

import { processNextBattleJob } from './battle-worker'

// ── Fixtures ─────────────────────────────────────────────────────────────────

const BASE_JOB = {
  job_id:                 'job-text-1',
  battle_id:              'battle-text-1',
  contender_id:           'contender-text-1',
  slot:                   'A' as const,
  task_prompt:            'Explain recursion in one paragraph.',
  provider_key:           'anthropic',
  model_key:              'claude-sonnet-4-6',
  byok_key_ref_id:        null as null,
  lens_id:                null as null,
  version_id:             null as null,
  max_tokens:             1024,
  temperature:            0.7,
  retry_count:            0,
  ai_lenser_id:           null as null,
  personality_note:       null as null,
  personality_version_id: null as null,
}

/** Configure mockRpc to claim a specific job and stub completion RPCs. */
function claimJob(job: typeof BASE_JOB = BASE_JOB): void {
  mockRpc.mockImplementation((name: string, args?: Record<string, unknown>) => {
    if (name === 'fn_worker_claim_battle_job')
      return Promise.resolve({ data: job, error: null })
    if (name === 'fn_worker_upsert_battle_submission')
      return Promise.resolve({ data: null, error: null })
    if (name === 'fn_worker_complete_battle_job')
      return Promise.resolve({ data: null, error: null })
    if (name === 'fn_requeue_battle_job_with_backoff')
      return Promise.resolve({ data: null, error: null })
    if (name === 'fn_move_battle_job_to_dlq')
      return Promise.resolve({ data: null, error: null })
    if (name === 'fn_worker_render_template')
      return Promise.resolve({ data: `rendered:${String(args?.['p_template_body'] ?? '')}`, error: null })
    if (name === 'fn_worker_decrypt_api_key')
      return Promise.resolve({ data: 'decrypted-byok-key', error: null })
    return Promise.resolve({ data: null, error: null })
  })
}

/** Captures the args passed to fn_worker_upsert_battle_submission. */
function captureUpsertArgs(): Record<string, unknown> | undefined {
  const call = mockRpc.mock.calls.find(
    (c: [string, unknown]) => c[0] === 'fn_worker_upsert_battle_submission',
  )
  return call?.[1] as Record<string, unknown> | undefined
}

/** Captures the args passed to fn_worker_complete_battle_job. */
function captureCompleteArgs(): Record<string, unknown> | undefined {
  const call = mockRpc.mock.calls.find(
    (c: [string, unknown]) => c[0] === 'fn_worker_complete_battle_job',
  )
  return call?.[1] as Record<string, unknown> | undefined
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('processNextBattleJob — native text path', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockModelKind.mockReturnValue(null)
  })

  // ─── 1. Basic text success ─────────────────────────────────────────────────

  describe('basic text success (no personality, no lens template)', () => {
    it('calls callProvider with resolved env key and stores result', async () => {
      claimJob()
      mockCallProvider.mockResolvedValue({
        content: 'Recursion is when a function calls itself.',
        usage: { input_tokens: 10, output_tokens: 20 },
      })

      const result = await processNextBattleJob()

      expect(result).toBe(true)
      expect(mockCallProvider).toHaveBeenCalledWith(
        'anthropic',
        'resolved-env-key',
        'claude-sonnet-4-6',
        [{ role: 'user', content: 'Explain recursion in one paragraph.' }],
        undefined,
        expect.any(AbortSignal),
      )

      const upsert = captureUpsertArgs()
      expect(upsert).toMatchObject({
        p_battle_id:       'battle-text-1',
        p_contender_id:    'contender-text-1',
        p_content_text:    'Recursion is when a function calls itself.',
        p_output_modality: 'text',
        p_is_final:        true,
      })

      expect(captureCompleteArgs()).toMatchObject({ p_status: 'completed' })
    })

    it('returns false when no job is available', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })

      const result = await processNextBattleJob()

      expect(result).toBe(false)
      expect(mockCallProvider).not.toHaveBeenCalled()
    })
  })

  // ─── 2. Personality note injected as system message ───────────────────────

  describe('personality note (plain text)', () => {
    it('prepends a system message when personality_note is set', async () => {
      const jobWithPersonality = {
        ...BASE_JOB,
        ai_lenser_id:    'lenser-123',
        personality_note: 'You are a pirate who loves recursion.',
      }
      claimJob(jobWithPersonality)
      mockCallProvider.mockResolvedValue({ content: 'Ahoy, recursion be calling itself, matey!' })

      await processNextBattleJob()

      const providerCall = mockCallProvider.mock.calls[0]
      const messages = providerCall[3] as Array<{ role: string; content: string }>
      expect(messages[0]).toEqual({ role: 'system', content: 'You are a pirate who loves recursion.' })
      expect(messages[1]).toEqual({ role: 'user',   content: BASE_JOB.task_prompt })
    })
  })

  // ─── 3. Personality lens template rendered via RPC ────────────────────────

  describe('personality lens template (personality_version_id set)', () => {
    it('renders personality template via fn_worker_render_template and uses result as system prompt', async () => {
      const jobWithPersonalityTemplate = {
        ...BASE_JOB,
        ai_lenser_id:           'lenser-123',
        personality_note:        'You are {{role}}.',
        personality_version_id:  'pv-abc',
      }
      claimJob(jobWithPersonalityTemplate)
      mockCallProvider.mockResolvedValue({ content: 'Template rendered response.' })

      await processNextBattleJob()

      // fn_worker_render_template must be called for personality
      const renderCall = mockRpc.mock.calls.find(
        (c: [string, unknown]) => c[0] === 'fn_worker_render_template',
      )
      expect(renderCall).toBeDefined()

      // The rendered personality becomes the system message
      const providerCall = mockCallProvider.mock.calls[0]
      const messages = providerCall[3] as Array<{ role: string; content: string }>
      expect(messages[0].role).toBe('system')
      expect(messages[0].content).toContain('rendered:')
    })
  })

  // ─── 4. Lens template rendered via fn_worker_render_template ─────────────

  describe('lens template rendering (version_id set)', () => {
    it('renders lens template before calling provider', async () => {
      const jobWithTemplate = { ...BASE_JOB, version_id: 'ver-xyz' }
      claimJob(jobWithTemplate)
      mockCallProvider.mockResolvedValue({ content: 'Template response.' })

      await processNextBattleJob()

      // fn_worker_render_template must be called
      const renderCall = mockRpc.mock.calls.find(
        (c: [string, unknown]) => c[0] === 'fn_worker_render_template',
      )
      expect(renderCall).toBeDefined()
      expect(renderCall?.[1]).toMatchObject({
        p_template_body: BASE_JOB.task_prompt,
        p_inputs:        { prompt: BASE_JOB.task_prompt },
      })

      // Provider receives the rendered prompt, not the raw task_prompt
      const providerCall = mockCallProvider.mock.calls[0]
      const messages = providerCall[3] as Array<{ role: string; content: string }>
      const userMessage = messages.find((m) => m.role === 'user')
      expect(userMessage?.content).toContain('rendered:')
    })
  })

  // ─── 5. BYOK key decryption ───────────────────────────────────────────────

  describe('BYOK key resolution', () => {
    it('decrypts the key via fn_worker_decrypt_api_key when byok_key_ref_id is set', async () => {
      const byokJob = { ...BASE_JOB, byok_key_ref_id: 'key-ref-99' }
      claimJob(byokJob)
      mockCallProvider.mockResolvedValue({ content: 'BYOK response.' })

      await processNextBattleJob()

      const decryptCall = mockRpc.mock.calls.find(
        (c: [string, unknown]) => c[0] === 'fn_worker_decrypt_api_key',
      )
      expect(decryptCall).toBeDefined()
      expect(decryptCall?.[1]).toMatchObject({ p_key_id: 'key-ref-99' })

      // The decrypted key is passed to callProvider
      expect(mockCallProvider).toHaveBeenCalledWith(
        'anthropic',
        'decrypted-byok-key',
        'claude-sonnet-4-6',
        expect.any(Array),
        undefined,
        expect.any(AbortSignal),
      )
    })

    it('throws and requeues when BYOK decryption fails', async () => {
      const byokJob = { ...BASE_JOB, byok_key_ref_id: 'key-ref-bad' }

      mockRpc.mockImplementation((name: string) => {
        if (name === 'fn_worker_claim_battle_job')
          return Promise.resolve({ data: byokJob, error: null })
        if (name === 'fn_worker_decrypt_api_key')
          return Promise.resolve({ data: null, error: { message: 'Key not found' } })
        if (name === 'fn_requeue_battle_job_with_backoff')
          return Promise.resolve({ data: null, error: null })
        return Promise.resolve({ data: null, error: null })
      })

      const result = await processNextBattleJob()

      expect(result).toBe(true)
      expect(mockCallProvider).not.toHaveBeenCalled()
      expect(mockRpc).toHaveBeenCalledWith(
        'fn_requeue_battle_job_with_backoff',
        expect.objectContaining({ p_job_id: 'job-text-1' }),
      )
    })
  })

  // ─── 6. Retry on provider error ───────────────────────────────────────────

  describe('retry on provider error', () => {
    it('requeues with backoff when provider throws and retry_count < MAX_RETRIES - 1', async () => {
      claimJob()
      mockCallProvider.mockRejectedValue(new Error('Rate limit exceeded'))

      const result = await processNextBattleJob()

      expect(result).toBe(true)
      expect(mockRpc).toHaveBeenCalledWith(
        'fn_requeue_battle_job_with_backoff',
        expect.objectContaining({
          p_job_id: 'job-text-1',
          p_error:  'Rate limit exceeded',
        }),
      )
      expect(mockRpc).not.toHaveBeenCalledWith(
        'fn_move_battle_job_to_dlq',
        expect.anything(),
      )
    })
  })

  // ─── 7. DLQ on max retries ────────────────────────────────────────────────

  describe('DLQ on max retries', () => {
    it('moves to DLQ when provider throws and retry_count >= MAX_RETRIES - 1', async () => {
      // With MAX_RETRIES=3 (default), retry_count=2 means we are on the third
      // attempt: 2 >= 3-1 → DLQ.
      const maxRetryJob = { ...BASE_JOB, retry_count: 2 }
      claimJob(maxRetryJob)
      mockCallProvider.mockRejectedValue(new Error('Provider permanently unavailable'))

      const result = await processNextBattleJob()

      expect(result).toBe(true)
      expect(mockRpc).toHaveBeenCalledWith(
        'fn_move_battle_job_to_dlq',
        expect.objectContaining({
          p_job_id:     'job-text-1',
          p_error_code: 'execute.max_retries_exceeded',
          p_error_msg:  'Provider permanently unavailable',
        }),
      )
      expect(mockRpc).not.toHaveBeenCalledWith(
        'fn_requeue_battle_job_with_backoff',
        expect.anything(),
      )
    })
  })
})
