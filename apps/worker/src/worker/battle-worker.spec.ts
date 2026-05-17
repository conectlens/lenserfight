// Phase AM — battle-worker unit tests (Chainabit execution path).
//
// All 4 paths exercise processNextBattleJobViaChainabit, selected by setting
// CHAINABIT_EXECUTION_ENABLED=true before module load.

const mockSubmit = jest.fn<Promise<string>, [unknown]>()
const mockPoll   = jest.fn()
const mockClaimRpc = jest.fn()
const mockCompleteRpc = jest.fn()
const mockRequeueRpc  = jest.fn()
const mockDlqRpc      = jest.fn()

jest.mock('@lenserfight/data/repositories', () => ({
  chainabitExecutionRepository: {
    submitBattleJob: (arg: unknown) => mockSubmit(arg as Parameters<typeof mockSubmit>[0]),
    pollBattleJob:   (...args: unknown[]) => mockPoll(...args),
  },
}))

jest.mock('@lenserfight/providers', () => ({
  byokKeyResolver: { resolve: jest.fn().mockReturnValue('test-api-key') },
  callProvider: jest.fn(),
}))

jest.mock('../lib/supabase', () => ({
  createServiceSupabaseClient: jest.fn(() => {
    const rpc = jest.fn((name: string) => {
      if (name === 'fn_worker_claim_battle_job')        return mockClaimRpc()
      if (name === 'fn_worker_complete_battle_job')    return mockCompleteRpc()
      if (name === 'fn_requeue_battle_job_with_backoff') return mockRequeueRpc()
      if (name === 'fn_move_battle_job_to_dlq')        return mockDlqRpc()
      return Promise.resolve({ data: null, error: null })
    })
    const schema = jest.fn().mockReturnValue({ rpc, from: jest.fn().mockReturnValue({ rpc }) })
    return { schema, rpc }
  }),
}))

process.env['CHAINABIT_EXECUTION_ENABLED'] = 'true'

import { processNextBattleJob } from './battle-worker'

const BASE_JOB = {
  job_id:              'job-1',
  battle_id:           'battle-1',
  contender_id:        'contender-1',
  slot:                'A' as const,
  task_prompt:         'write a poem',
  provider_key:        'openai',
  model_key:           'gpt-4o',
  byok_key_ref_id:     null as null,
  lens_id:             null as null,
  version_id:          null as null,
  max_tokens:          512,
  temperature:         0.7,
  retry_count:         0,
  ai_lenser_id:        null as null,
  personality_note:    null as null,
  personality_version_id: null as null,
}

describe('processNextBattleJob (Chainabit path)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockPoll.mockReset()
    mockClaimRpc.mockResolvedValue({ data: BASE_JOB, error: null })
    mockCompleteRpc.mockResolvedValue({ error: null })
    mockRequeueRpc.mockResolvedValue({ error: null })
    mockDlqRpc.mockResolvedValue({ error: null })
  })

  it('path 1 — success: submit → poll completed → fn_complete_battle_execution_job called', async () => {
    mockSubmit.mockResolvedValueOnce('ext-job-abc')
    mockPoll.mockResolvedValueOnce({ status: 'completed', outputText: 'A lovely poem', externalJobId: 'ext-job-abc' })

    const result = await processNextBattleJob()

    expect(result).toBe(true)
    expect(mockSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ jobId: 'job-1', battleId: 'battle-1', slot: 'A' }),
    )
    expect(mockCompleteRpc).toHaveBeenCalled()
  })

  it('path 2 — poll timeout: polling exceeds TIMEOUT_MS → requeued (retry_count < MAX_RETRIES)', async () => {
    mockSubmit.mockResolvedValueOnce('ext-job-timeout')
    // Always return pending so the deadline is hit
    mockPoll.mockResolvedValue({ status: 'pending', externalJobId: 'ext-job-timeout' })

    // Override Date.now so the deadline is immediately exceeded after submission
    const realNow = Date.now
    let callCount = 0
    jest.spyOn(Date, 'now').mockImplementation(() => {
      callCount++
      // calls 1-2: startedAt + deadline both get realNow() so deadline = now + TIMEOUT_MS
      // call 3+: returns far past deadline so the loop check throws immediately
      return callCount <= 2 ? realNow() : realNow() + 400_000
    })

    const result = await processNextBattleJob()

    expect(result).toBe(true)
    expect(mockRequeueRpc).toHaveBeenCalled()
    expect(mockDlqRpc).not.toHaveBeenCalled()

    jest.restoreAllMocks()
  })

  it('path 3 — DLQ move: provider returns failed AND retry_count >= MAX_RETRIES - 1', async () => {
    const maxRetriesJob = { ...BASE_JOB, retry_count: 2 }  // MAX_RETRIES defaults to 3; 2 >= 3-1
    mockClaimRpc.mockResolvedValueOnce({ data: maxRetriesJob, error: null })
    mockSubmit.mockResolvedValueOnce('ext-job-fail')
    mockPoll.mockResolvedValueOnce({
      status: 'failed',
      errorMessage: 'provider error',
      externalJobId: 'ext-job-fail',
    })

    const result = await processNextBattleJob()

    expect(result).toBe(true)
    expect(mockDlqRpc).toHaveBeenCalled()
    expect(mockRequeueRpc).not.toHaveBeenCalled()
  })

  it('path 4 — retry backoff: provider returns failed AND retry_count < MAX_RETRIES - 1', async () => {
    const lowRetryJob = { ...BASE_JOB, retry_count: 0 }
    mockClaimRpc.mockResolvedValueOnce({ data: lowRetryJob, error: null })
    mockSubmit.mockResolvedValueOnce('ext-job-retry')
    mockPoll.mockResolvedValueOnce({
      status: 'failed',
      errorMessage: 'transient error',
      externalJobId: 'ext-job-retry',
    })

    const result = await processNextBattleJob()

    expect(result).toBe(true)
    expect(mockRequeueRpc).toHaveBeenCalled()
    expect(mockDlqRpc).not.toHaveBeenCalled()
  })
})
