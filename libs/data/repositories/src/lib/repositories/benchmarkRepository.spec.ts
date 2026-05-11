import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockRpc } = vi.hoisted(() => ({ mockRpc: vi.fn() }))

vi.mock('@lenserfight/data/supabase', () => ({
  supabase: { rpc: mockRpc },
}))

import { SupabaseBenchmarkRepository } from './benchmarkRepository'

const SUITE_ID = 'suite-uuid-1'
const LENSER_ID = 'lenser-uuid-1'
const TASK_ID = 'task-uuid-1'
const RESULT_SET_ID = 'result-uuid-1'

const rawSuite = { id: SUITE_ID, title: 'Suite A', description: null, category: 'coding', is_public: true, created_at: '2026-01-01T00:00:00Z' }
const rawTask = { id: TASK_ID, suite_id: SUITE_ID, title: 'Task 1', prompt_template: '{{input}}', evaluation_protocol: {}, required_repetitions: 1, ordinal: 0, created_at: '2026-01-01T00:00:00Z' }

describe('SupabaseBenchmarkRepository', () => {
  let repo: SupabaseBenchmarkRepository

  beforeEach(() => {
    repo = new SupabaseBenchmarkRepository()
    vi.clearAllMocks()
    mockRpc.mockResolvedValue({ data: null, error: null })
  })

  // ---------------------------------------------------------------------------
  // handleError (via listSuites)
  // ---------------------------------------------------------------------------
  describe('handleError (via listSuites)', () => {
    it('throws "Benchmark record not found." on PGRST116', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
      await expect(repo.listSuites()).rejects.toThrow('Benchmark record not found.')
    })

    it('rethrows generic errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('db error') })
      await expect(repo.listSuites()).rejects.toThrow('db error')
    })
  })

  // ---------------------------------------------------------------------------
  // listSuites
  // ---------------------------------------------------------------------------
  describe('listSuites', () => {
    it('calls fn_list_benchmark_suites with null creator and defaults', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.listSuites()
      expect(mockRpc).toHaveBeenCalledWith('fn_list_benchmark_suites', {
        p_creator_lenser_id: null,
        p_limit: 100,
        p_cursor: null,
      })
    })

    it('passes creatorLenserId when provided', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.listSuites(LENSER_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_list_benchmark_suites', expect.objectContaining({
        p_creator_lenser_id: LENSER_ID,
      }))
    })

    it('returns suites', async () => {
      mockRpc.mockResolvedValue({ data: [rawSuite], error: null })
      const result = await repo.listSuites()
      expect(result[0].title).toBe('Suite A')
    })

    it('returns empty array when data is null', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.listSuites()).toEqual([])
    })
  })

  // ---------------------------------------------------------------------------
  // getSuite
  // ---------------------------------------------------------------------------
  describe('getSuite', () => {
    it('calls fn_get_benchmark_suite with p_suite_id', async () => {
      mockRpc.mockResolvedValue({ data: [rawSuite], error: null })
      const result = await repo.getSuite(SUITE_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_get_benchmark_suite', { p_suite_id: SUITE_ID })
      expect(result?.id).toBe(SUITE_ID)
    })

    it('returns null when data is empty', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      expect(await repo.getSuite(SUITE_ID)).toBeNull()
    })
  })

  // ---------------------------------------------------------------------------
  // getTasksBySuite
  // ---------------------------------------------------------------------------
  describe('getTasksBySuite', () => {
    it('calls fn_list_benchmark_tasks with p_suite_id', async () => {
      mockRpc.mockResolvedValue({ data: [rawTask], error: null })
      const result = await repo.getTasksBySuite(SUITE_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_list_benchmark_tasks', { p_suite_id: SUITE_ID })
      expect(result[0].id).toBe(TASK_ID)
    })

    it('returns empty array when data is null', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.getTasksBySuite(SUITE_ID)).toEqual([])
    })
  })

  // ---------------------------------------------------------------------------
  // createSuite
  // ---------------------------------------------------------------------------
  describe('createSuite', () => {
    it('calls fn_create_benchmark_suite then getSuite', async () => {
      mockRpc
        .mockResolvedValueOnce({ data: SUITE_ID, error: null })  // fn_create_benchmark_suite
        .mockResolvedValueOnce({ data: [rawSuite], error: null }) // fn_get_benchmark_suite
      const result = await repo.createSuite({ title: 'Suite A', is_public: true }, LENSER_ID)
      expect(mockRpc.mock.calls[0][0]).toBe('fn_create_benchmark_suite')
      expect(mockRpc.mock.calls[0][1]).toEqual({
        p_title: 'Suite A',
        p_description: null,
        p_category: null,
        p_is_public: true,
      })
      expect(result.id).toBe(SUITE_ID)
    })

    it('throws "Failed to create benchmark suite" when RPC returns null id', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      await expect(repo.createSuite({ title: 'T' }, LENSER_ID)).rejects.toThrow('Failed to create benchmark suite')
    })
  })

  // ---------------------------------------------------------------------------
  // createTask
  // ---------------------------------------------------------------------------
  describe('createTask', () => {
    it('calls fn_create_benchmark_task with correct params', async () => {
      mockRpc
        .mockResolvedValueOnce({ data: TASK_ID, error: null }) // fn_create_benchmark_task
        .mockResolvedValueOnce({ data: [rawTask], error: null }) // fn_list_benchmark_tasks
      await repo.createTask({
        suite_id: SUITE_ID,
        title: 'Task 1',
        prompt_template: '{{input}}',
      })
      expect(mockRpc.mock.calls[0][0]).toBe('fn_create_benchmark_task')
      expect(mockRpc.mock.calls[0][1]).toEqual(expect.objectContaining({
        p_suite_id: SUITE_ID,
        p_title: 'Task 1',
        p_prompt_template: '{{input}}',
        p_evaluation_protocol: {},
        p_required_repetitions: 1,
        p_ordinal: 0,
      }))
    })

    it('throws "Failed to create benchmark task" when RPC returns null id', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      await expect(repo.createTask({ suite_id: SUITE_ID, title: 'T', prompt_template: 'P' })).rejects.toThrow('Failed to create benchmark task')
    })
  })

  // ---------------------------------------------------------------------------
  // invalidateResult
  // ---------------------------------------------------------------------------
  describe('invalidateResult', () => {
    it('calls fn_create_benchmark_invalidation and returns InvalidationRecord', async () => {
      mockRpc.mockResolvedValue({ data: 'invalidation-1', error: null })
      const result = await repo.invalidateResult({ result_set_id: RESULT_SET_ID, reason: 'bias detected' }, LENSER_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_create_benchmark_invalidation', {
        p_result_set_id: RESULT_SET_ID,
        p_reason: 'bias detected',
      })
      expect(result.id).toBe('invalidation-1')
      expect(result.reason).toBe('bias detected')
    })

    it('throws when invalidation id is null', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      await expect(repo.invalidateResult({ result_set_id: RESULT_SET_ID, reason: 'r' }, LENSER_ID)).rejects.toThrow('Failed to create benchmark invalidation')
    })
  })
})
