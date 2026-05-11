import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockSubmitJob, mockPollJob } = vi.hoisted(() => ({
  mockSubmitJob: vi.fn(),
  mockPollJob: vi.fn(),
}))

vi.mock('@lenserfight/infra/execution', () => ({
  chainabitExecutionClient: {
    submitJob: mockSubmitJob,
    pollJob: mockPollJob,
  },
}))

import { ChainbitExecutionRepository } from './chainabitExecutionRepository'

const EXTERNAL_JOB_ID = 'ext-job-uuid-1'

const baseInput = {
  jobId: 'job-1',
  battleId: 'battle-1',
  slot: 'A' as const,
  prompt: 'Write a poem',
  providerKey: 'openai',
  modelKey: 'gpt-4',
  apiKey: 'sk-xxx',
  maxTokens: 2000,
  temperature: 0.7,
}

describe('ChainbitExecutionRepository', () => {
  let repo: ChainbitExecutionRepository

  beforeEach(() => {
    repo = new ChainbitExecutionRepository()
    vi.clearAllMocks()
  })

  // ---------------------------------------------------------------------------
  // submitBattleJob
  // ---------------------------------------------------------------------------
  describe('submitBattleJob', () => {
    it('delegates to chainabitExecutionClient.submitJob with full payload', async () => {
      mockSubmitJob.mockResolvedValue(EXTERNAL_JOB_ID)
      const result = await repo.submitBattleJob(baseInput)
      expect(mockSubmitJob).toHaveBeenCalledWith({
        jobId: 'job-1',
        battleId: 'battle-1',
        slot: 'A',
        prompt: 'Write a poem',
        systemPrompt: undefined,
        providerKey: 'openai',
        modelKey: 'gpt-4',
        apiKey: 'sk-xxx',
        maxTokens: 2000,
        temperature: 0.7,
      })
      expect(result).toBe(EXTERNAL_JOB_ID)
    })

    it('passes systemPrompt when provided', async () => {
      mockSubmitJob.mockResolvedValue(EXTERNAL_JOB_ID)
      await repo.submitBattleJob({ ...baseInput, systemPrompt: 'You are a poet.' })
      expect(mockSubmitJob).toHaveBeenCalledWith(expect.objectContaining({
        systemPrompt: 'You are a poet.',
      }))
    })

    it('propagates errors from client', async () => {
      mockSubmitJob.mockRejectedValue(new Error('submission failed'))
      await expect(repo.submitBattleJob(baseInput)).rejects.toThrow('submission failed')
    })
  })

  // ---------------------------------------------------------------------------
  // pollBattleJob
  // ---------------------------------------------------------------------------
  describe('pollBattleJob', () => {
    it('delegates to chainabitExecutionClient.pollJob and maps result', async () => {
      const status = {
        externalJobId: EXTERNAL_JOB_ID,
        status: 'completed' as const,
        outputText: 'A lovely poem',
        errorMessage: undefined,
      }
      mockPollJob.mockResolvedValue(status)
      const result = await repo.pollBattleJob(EXTERNAL_JOB_ID)
      expect(mockPollJob).toHaveBeenCalledWith(EXTERNAL_JOB_ID)
      expect(result.externalJobId).toBe(EXTERNAL_JOB_ID)
      expect(result.status).toBe('completed')
      expect(result.outputText).toBe('A lovely poem')
    })

    it('maps failed status correctly', async () => {
      mockPollJob.mockResolvedValue({ externalJobId: EXTERNAL_JOB_ID, status: 'failed', errorMessage: 'Model overloaded' })
      const result = await repo.pollBattleJob(EXTERNAL_JOB_ID)
      expect(result.status).toBe('failed')
      expect(result.errorMessage).toBe('Model overloaded')
    })

    it('propagates errors from client', async () => {
      mockPollJob.mockRejectedValue(new Error('poll failed'))
      await expect(repo.pollBattleJob(EXTERNAL_JOB_ID)).rejects.toThrow('poll failed')
    })
  })
})
