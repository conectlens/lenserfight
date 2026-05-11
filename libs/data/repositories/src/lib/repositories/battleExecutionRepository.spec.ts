import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockRpc, mockFrom, chainMethods } = vi.hoisted(() => {
  const chainMethods: Record<string, ReturnType<typeof vi.fn>> = {
    insert: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    single: vi.fn(),
  }
  Object.values(chainMethods).forEach((m) => m.mockReturnValue(chainMethods))
  return {
    mockRpc: vi.fn(),
    mockFrom: vi.fn().mockReturnValue(chainMethods),
    chainMethods,
  }
})

vi.mock('@lenserfight/data/supabase', () => ({
  supabase: {
    rpc: mockRpc,
    from: mockFrom,
  },
}))

import { battleExecutionRepository } from './battleExecutionRepository'

const BATTLE_ID = 'battle-uuid-1'
const CONTENDER_ID = 'contender-uuid-1'
const RUN_ID = 'run-uuid-1'

describe('battleExecutionRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRpc.mockResolvedValue({ data: null, error: null })
    mockFrom.mockReturnValue(chainMethods)
    // Default: all chain methods return chainMethods (non-terminal)
    Object.values(chainMethods).forEach((m) => m.mockReturnValue(chainMethods))
    // Terminal overrides for common patterns
    chainMethods.single.mockResolvedValue({ data: null, error: null })
    chainMethods.order.mockResolvedValue({ data: [], error: null })
    // eq returns chainMethods by default so order/upsert can be chained after it
    // Override per-test when eq is the terminal call
  })

  // ---------------------------------------------------------------------------
  // getExecutionConfig
  // ---------------------------------------------------------------------------
  describe('getExecutionConfig', () => {
    it('calls fn_get_battle_execution_config with battleId and contenderId', async () => {
      mockRpc.mockResolvedValue({ data: [{ id: 'cfg-1' }], error: null })
      const result = await battleExecutionRepository.getExecutionConfig(BATTLE_ID, CONTENDER_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_get_battle_execution_config', {
        p_battle_id: BATTLE_ID,
        p_contender_id: CONTENDER_ID,
      })
      expect(result?.id).toBe('cfg-1')
    })

    it('passes null when no contenderId', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      await battleExecutionRepository.getExecutionConfig(BATTLE_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_get_battle_execution_config', expect.objectContaining({
        p_contender_id: null,
      }))
    })

    it('returns null on error (silently swallowed)', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('config error') })
      expect(await battleExecutionRepository.getExecutionConfig(BATTLE_ID)).toBeNull()
    })

    it('handles data returned as array — takes first element', async () => {
      mockRpc.mockResolvedValue({ data: [{ id: 'cfg-1' }, { id: 'cfg-2' }], error: null })
      const result = await battleExecutionRepository.getExecutionConfig(BATTLE_ID)
      expect(result?.id).toBe('cfg-1')
    })
  })

  // ---------------------------------------------------------------------------
  // upsertExecutionConfig
  // ---------------------------------------------------------------------------
  describe('upsertExecutionConfig', () => {
    it('calls fn_upsert_battle_execution_config with all fields', async () => {
      mockRpc.mockResolvedValue({ data: { id: 'cfg-1' }, error: null })
      await battleExecutionRepository.upsertExecutionConfig({
        battle_id: BATTLE_ID,
        contender_id: CONTENDER_ID,
        provider_key: 'openai',
        model_key: 'gpt-4',
        funding_source: 'platform',
      })
      expect(mockRpc).toHaveBeenCalledWith('fn_upsert_battle_execution_config', expect.objectContaining({
        p_battle_id: BATTLE_ID,
        p_contender_id: CONTENDER_ID,
        p_provider_key: 'openai',
        p_model_key: 'gpt-4',
        p_funding_source: 'platform',
      }))
    })

    it('uses default max_tokens=4096 and temperature=0.7', async () => {
      mockRpc.mockResolvedValue({ data: { id: 'cfg-1' }, error: null })
      await battleExecutionRepository.upsertExecutionConfig({
        battle_id: BATTLE_ID,
        provider_key: 'openai',
        model_key: 'gpt-4',
        funding_source: 'platform',
      })
      expect(mockRpc).toHaveBeenCalledWith('fn_upsert_battle_execution_config', expect.objectContaining({
        p_max_tokens: 4096,
        p_temperature: 0.7,
      }))
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('upsert error') })
      await expect(battleExecutionRepository.upsertExecutionConfig({
        battle_id: BATTLE_ID, provider_key: 'openai', model_key: 'gpt-4', funding_source: 'platform',
      })).rejects.toThrow('upsert error')
    })
  })

  // ---------------------------------------------------------------------------
  // createContenderRun
  // ---------------------------------------------------------------------------
  describe('createContenderRun', () => {
    it('inserts into contender_runs and returns record', async () => {
      const record = { id: 'run-1', battle_id: BATTLE_ID, contender_id: CONTENDER_ID, run_id: RUN_ID, ordinal: 1, status: 'running', credit_cost: null, created_at: '2026-01-01' }
      chainMethods.single.mockResolvedValue({ data: record, error: null })
      const result = await battleExecutionRepository.createContenderRun(BATTLE_ID, CONTENDER_ID, RUN_ID, 1)
      expect(mockFrom).toHaveBeenCalledWith('contender_runs')
      expect(chainMethods.insert).toHaveBeenCalledWith(expect.objectContaining({
        battle_id: BATTLE_ID,
        contender_id: CONTENDER_ID,
        run_id: RUN_ID,
        ordinal: 1,
        status: 'running',
      }))
      expect(result.id).toBe('run-1')
    })

    it('rethrows errors', async () => {
      chainMethods.single.mockResolvedValue({ data: null, error: new Error('insert error') })
      await expect(battleExecutionRepository.createContenderRun(BATTLE_ID, CONTENDER_ID, RUN_ID, 1)).rejects.toThrow('insert error')
    })
  })

  // ---------------------------------------------------------------------------
  // updateContenderRunStatus
  // ---------------------------------------------------------------------------
  describe('updateContenderRunStatus', () => {
    it('updates status on contender_runs by id', async () => {
      chainMethods.eq.mockResolvedValue({ data: null, error: null })
      await battleExecutionRepository.updateContenderRunStatus('run-1', 'completed')
      expect(mockFrom).toHaveBeenCalledWith('contender_runs')
      expect(chainMethods.update).toHaveBeenCalledWith({ status: 'completed' })
      expect(chainMethods.eq).toHaveBeenCalledWith('id', 'run-1')
    })

    it('includes credit_cost in update when provided', async () => {
      chainMethods.eq.mockResolvedValue({ data: null, error: null })
      await battleExecutionRepository.updateContenderRunStatus('run-1', 'completed', 150)
      expect(chainMethods.update).toHaveBeenCalledWith({ status: 'completed', credit_cost: 150 })
    })

    it('rethrows errors', async () => {
      chainMethods.eq.mockResolvedValue({ data: null, error: new Error('update error') })
      await expect(battleExecutionRepository.updateContenderRunStatus('run-1', 'failed')).rejects.toThrow('update error')
    })
  })

  // ---------------------------------------------------------------------------
  // insertBattleEvent
  // ---------------------------------------------------------------------------
  describe('insertBattleEvent', () => {
    it('inserts into events table', async () => {
      chainMethods.insert.mockResolvedValue({ data: null, error: null })
      await battleExecutionRepository.insertBattleEvent(BATTLE_ID, 'generation_started', 'actor-1', { nodeId: 'n-1' })
      expect(mockFrom).toHaveBeenCalledWith('events')
      expect(chainMethods.insert).toHaveBeenCalledWith({
        battle_id: BATTLE_ID,
        event_type: 'generation_started',
        actor_id: 'actor-1',
        metadata: { nodeId: 'n-1' },
      })
    })

    it('passes null for absent actor and metadata', async () => {
      chainMethods.insert.mockResolvedValue({ data: null, error: null })
      await battleExecutionRepository.insertBattleEvent(BATTLE_ID, 'battle_started')
      expect(chainMethods.insert).toHaveBeenCalledWith(expect.objectContaining({
        actor_id: null,
        metadata: null,
      }))
    })

    it('rethrows errors', async () => {
      chainMethods.insert.mockResolvedValue({ data: null, error: new Error('event error') })
      await expect(battleExecutionRepository.insertBattleEvent(BATTLE_ID, 'test')).rejects.toThrow('event error')
    })
  })

  // ---------------------------------------------------------------------------
  // transitionBattleStatus
  // ---------------------------------------------------------------------------
  describe('transitionBattleStatus', () => {
    it('updates status on battles table by id', async () => {
      chainMethods.eq.mockResolvedValue({ data: null, error: null })
      await battleExecutionRepository.transitionBattleStatus(BATTLE_ID, 'voting_open')
      expect(mockFrom).toHaveBeenCalledWith('battles')
      expect(chainMethods.update).toHaveBeenCalledWith({ status: 'voting_open' })
      expect(chainMethods.eq).toHaveBeenCalledWith('id', BATTLE_ID)
    })

    it('rethrows errors', async () => {
      chainMethods.eq.mockResolvedValue({ data: null, error: new Error('transition error') })
      await expect(battleExecutionRepository.transitionBattleStatus(BATTLE_ID, 'completed')).rejects.toThrow('transition error')
    })
  })

  // ---------------------------------------------------------------------------
  // submitExecutionResult
  // ---------------------------------------------------------------------------
  describe('submitExecutionResult', () => {
    it('upserts into submissions with ON CONFLICT on battle_id,contender_id', async () => {
      chainMethods.upsert.mockResolvedValue({ data: null, error: null })
      await battleExecutionRepository.submitExecutionResult(BATTLE_ID, CONTENDER_ID, 'result text')
      expect(mockFrom).toHaveBeenCalledWith('submissions')
      expect(chainMethods.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ battle_id: BATTLE_ID, contender_id: CONTENDER_ID, content_text: 'result text', status: 'submitted' }),
        { onConflict: 'battle_id,contender_id' }
      )
    })

    it('rethrows errors', async () => {
      chainMethods.upsert.mockResolvedValue({ data: null, error: new Error('submit error') })
      await expect(battleExecutionRepository.submitExecutionResult(BATTLE_ID, CONTENDER_ID, 'text')).rejects.toThrow('submit error')
    })
  })

  // ---------------------------------------------------------------------------
  // getStreamRecordings
  // ---------------------------------------------------------------------------
  describe('getStreamRecordings', () => {
    it('queries stream_recordings by battle_id ordered by slot', async () => {
      const recordings = [{ id: 'r-1', battle_id: BATTLE_ID, slot: 'A' }]
      chainMethods.order.mockResolvedValue({ data: recordings, error: null })
      const result = await battleExecutionRepository.getStreamRecordings(BATTLE_ID)
      expect(mockFrom).toHaveBeenCalledWith('stream_recordings')
      expect(chainMethods.eq).toHaveBeenCalledWith('battle_id', BATTLE_ID)
      expect(chainMethods.order).toHaveBeenCalledWith('slot', { ascending: true })
      expect(result).toHaveLength(1)
    })

    it('rethrows errors', async () => {
      chainMethods.order.mockResolvedValue({ data: null, error: new Error('recordings error') })
      await expect(battleExecutionRepository.getStreamRecordings(BATTLE_ID)).rejects.toThrow('recordings error')
    })
  })
})
