// Batch 1 — battle-worker media routing tests (direct / non-Chainabit path).
//
// Covers the three new execution branches added in Phase CT:
//   - image sync (provider returns { status: 'completed', urls: [...] })
//   - audio sync (same as image sync, different MIME type)
//   - video async (provider returns { status: 'pending', providerTaskId })
//   - music async (kind maps to 'audio' output_modality)
//   - unknown model key falls back to text path
//   - media provider failure requeues the job
//
// CHAINABIT_EXECUTION_ENABLED must be 'false' (the default) so the direct path
// is exercised.

const mockCallProvider         = jest.fn()
const mockCallGenerativeMedia  = jest.fn()
const mockModelKind            = jest.fn()

// A single stable rpc mock shared across all createServiceSupabaseClient() calls.
const mockRpc = jest.fn()

jest.mock('@lenserfight/providers', () => ({
  callProvider:          (...args: unknown[]) => mockCallProvider(...args),
  callGenerativeMedia:   (...args: unknown[]) => mockCallGenerativeMedia(...args),
  modelKind:             (key: string)        => mockModelKind(key),
  byokKeyResolver:       { resolve: jest.fn().mockReturnValue('test-api-key') },
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

// Ensure the direct path (not Chainabit) is exercised.
process.env['CHAINABIT_EXECUTION_ENABLED'] = 'false'

import { processNextBattleJob } from './battle-worker'

const BASE_JOB = {
  job_id:                 'job-media-1',
  battle_id:              'battle-media-1',
  contender_id:           'contender-media-1',
  slot:                   'A' as const,
  task_prompt:            'Generate a dramatic sunset over mountains',
  provider_key:           'openai',
  model_key:              'dall-e-3',
  byok_key_ref_id:        null as null,
  lens_id:                null as null,
  version_id:             null as null,
  max_tokens:             512,
  temperature:            0.7,
  retry_count:            0,
  ai_lenser_id:           null as null,
  personality_note:       null as null,
  personality_version_id: null as null,
}

/** Returns the args passed to fn_worker_upsert_battle_submission from mockRpc. */
function captureUpsertArgs(): Record<string, unknown> | undefined {
  const call = mockRpc.mock.calls.find(
    (c: [string, unknown]) => c[0] === 'fn_worker_upsert_battle_submission',
  )
  return call?.[1] as Record<string, unknown> | undefined
}

describe('processNextBattleJob — direct media routing (non-Chainabit)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Default: no job available (return false immediately)
    mockRpc.mockImplementation((name: string) => {
      if (name === 'fn_worker_claim_battle_job')         return Promise.resolve({ data: null, error: null })
      if (name === 'fn_worker_upsert_battle_submission') return Promise.resolve({ data: null, error: null })
      if (name === 'fn_worker_complete_battle_job')      return Promise.resolve({ data: null, error: null })
      if (name === 'fn_requeue_battle_job_with_backoff') return Promise.resolve({ data: null, error: null })
      if (name === 'fn_move_battle_job_to_dlq')          return Promise.resolve({ data: null, error: null })
      return Promise.resolve({ data: null, error: null })
    })
  })

  function claimJob(job: typeof BASE_JOB = BASE_JOB): void {
    mockRpc.mockImplementation((name: string) => {
      if (name === 'fn_worker_claim_battle_job')         return Promise.resolve({ data: job, error: null })
      if (name === 'fn_worker_upsert_battle_submission') return Promise.resolve({ data: null, error: null })
      if (name === 'fn_worker_complete_battle_job')      return Promise.resolve({ data: null, error: null })
      if (name === 'fn_requeue_battle_job_with_backoff') return Promise.resolve({ data: null, error: null })
      if (name === 'fn_move_battle_job_to_dlq')          return Promise.resolve({ data: null, error: null })
      return Promise.resolve({ data: null, error: null })
    })
  }

  describe('image sync (text_to_image)', () => {
    it('calls callGenerativeMedia with image modality and stores URL in submission', async () => {
      mockModelKind.mockReturnValue('image')
      claimJob()
      mockCallGenerativeMedia.mockResolvedValue({
        status: 'completed',
        urls: ['https://cdn.example.com/generated-image.png'],
        mimeType: 'image/png',
      })

      const result = await processNextBattleJob()

      expect(result).toBe(true)
      expect(mockCallGenerativeMedia).toHaveBeenCalledWith(
        'openai',        // provider_key from job
        'image',         // modality derived from modelKind
        'test-api-key',
        'dall-e-3',
        BASE_JOB.task_prompt,
      )
      expect(mockCallProvider).not.toHaveBeenCalled()

      const upsertArgs = captureUpsertArgs()
      expect(upsertArgs).toBeDefined()
      expect(upsertArgs).toMatchObject({
        p_battle_id:       'battle-media-1',
        p_contender_id:    'contender-media-1',
        p_media_url:       'https://cdn.example.com/generated-image.png',
        p_mime_type:       'image/png',
        p_output_modality: 'image',
        p_is_final:        true,
        p_content_text:    null,
      })

      // Job should be marked completed
      expect(mockRpc).toHaveBeenCalledWith(
        'fn_worker_complete_battle_job',
        expect.objectContaining({ p_status: 'completed' }),
      )
    })
  })

  describe('audio sync (text_to_speech)', () => {
    it('calls callGenerativeMedia with audio modality and stores URL', async () => {
      const audioJob = { ...BASE_JOB, provider_key: 'elevenlabs', model_key: 'eleven-monolingual-v1' }
      mockModelKind.mockReturnValue('audio')
      claimJob(audioJob)
      mockCallGenerativeMedia.mockResolvedValue({
        status: 'completed',
        urls: ['https://cdn.example.com/speech.mp3'],
        mimeType: 'audio/mpeg',
      })

      await processNextBattleJob()

      expect(mockCallGenerativeMedia).toHaveBeenCalledWith(
        'elevenlabs',
        'audio',
        'test-api-key',
        'eleven-monolingual-v1',
        audioJob.task_prompt,
      )
      const upsertArgs = captureUpsertArgs()
      expect(upsertArgs).toMatchObject({
        p_media_url:       'https://cdn.example.com/speech.mp3',
        p_mime_type:       'audio/mpeg',
        p_output_modality: 'audio',
        p_is_final:        true,
      })
    })
  })

  describe('video async (text_to_video)', () => {
    it('stores providerTaskId in artifact_id and sets is_final=false', async () => {
      const videoJob = { ...BASE_JOB, provider_key: 'kling', model_key: 'kling-v1' }
      mockModelKind.mockReturnValue('video')
      claimJob(videoJob)
      mockCallGenerativeMedia.mockResolvedValue({
        status: 'pending',
        providerTaskId: 'kling-task-abc123',
      })

      await processNextBattleJob()

      const upsertArgs = captureUpsertArgs()
      expect(upsertArgs).toBeDefined()
      expect(upsertArgs).toMatchObject({
        p_artifact_id:     'kling-task-abc123',
        p_output_modality: 'video',
        p_is_final:        false,
      })
      // content_text and media_url are not set for pending tasks
      expect(upsertArgs?.['p_content_text']).toBeNull()
      expect(upsertArgs?.['p_media_url']).toBeUndefined()

      // Job is still completed (the poll worker finalises the URL later)
      expect(mockRpc).toHaveBeenCalledWith(
        'fn_worker_complete_battle_job',
        expect.objectContaining({ p_status: 'completed' }),
      )
    })
  })

  describe('music async', () => {
    it('maps music kind to audio output_modality', async () => {
      const musicJob = { ...BASE_JOB, provider_key: 'suno', model_key: 'suno-v4' }
      mockModelKind.mockReturnValue('music')
      claimJob(musicJob)
      mockCallGenerativeMedia.mockResolvedValue({
        status: 'pending',
        providerTaskId: 'suno-task-xyz',
      })

      await processNextBattleJob()

      const upsertArgs = captureUpsertArgs()
      // music kind maps to 'audio' output_modality (browsers play it via <audio>)
      expect(upsertArgs).toMatchObject({ p_output_modality: 'audio' })
    })
  })

  describe('unknown model key fallback', () => {
    it('routes to text path when modelKind returns null', async () => {
      const unknownJob = { ...BASE_JOB, provider_key: 'openai', model_key: 'unknown-model-x' }
      mockModelKind.mockReturnValue(null)
      claimJob(unknownJob)
      mockCallProvider.mockResolvedValue({ content: 'Fallback text response' })

      await processNextBattleJob()

      expect(mockCallProvider).toHaveBeenCalled()
      expect(mockCallGenerativeMedia).not.toHaveBeenCalled()

      const upsertArgs = captureUpsertArgs()
      expect(upsertArgs).toMatchObject({
        p_content_text: 'Fallback text response',
        p_output_modality: 'text',
      })
    })
  })

  describe('media provider failure', () => {
    it('requeues job when callGenerativeMedia returns failed status', async () => {
      mockModelKind.mockReturnValue('image')
      claimJob()
      mockCallGenerativeMedia.mockResolvedValue({
        status: 'failed',
        message: 'Content policy violation',
      })

      await processNextBattleJob()

      expect(mockRpc).toHaveBeenCalledWith(
        'fn_requeue_battle_job_with_backoff',
        expect.objectContaining({ p_job_id: 'job-media-1' }),
      )
      expect(mockRpc).not.toHaveBeenCalledWith(
        'fn_worker_complete_battle_job',
        expect.anything(),
      )
    })
  })
})
