import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockRpc } = vi.hoisted(() => ({ mockRpc: vi.fn() }))

vi.mock('@lenserfight/data/supabase', () => ({
  supabase: { rpc: mockRpc },
}))

import { SupabaseAdminRepository } from './adminRepository'

const DLQ_ID = 'dlq-uuid-1'

describe('SupabaseAdminRepository', () => {
  let repo: SupabaseAdminRepository

  beforeEach(() => {
    repo = new SupabaseAdminRepository()
    vi.clearAllMocks()
    mockRpc.mockResolvedValue({ data: null, error: null })
  })

  // ---------------------------------------------------------------------------
  // getWorkerHealth
  // ---------------------------------------------------------------------------
  describe('getWorkerHealth', () => {
    it('calls fn_admin_get_worker_health with no params', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getWorkerHealth()
      expect(mockRpc).toHaveBeenCalledWith('fn_admin_get_worker_health')
    })

    it('returns worker health records', async () => {
      const record = { worker_id: 'w-1', worker_type: 'battle_runner', last_seen_at: '2026-01-01T00:00:00Z', is_healthy: true, seconds_since: 5 }
      mockRpc.mockResolvedValue({ data: [record], error: null })
      const result = await repo.getWorkerHealth()
      expect(result[0].worker_id).toBe('w-1')
      expect(result[0].is_healthy).toBe(true)
    })

    it('returns empty array when data is null', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.getWorkerHealth()).toEqual([])
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('health error') })
      await expect(repo.getWorkerHealth()).rejects.toThrow('health error')
    })
  })

  // ---------------------------------------------------------------------------
  // getDLQEntries
  // ---------------------------------------------------------------------------
  describe('getDLQEntries', () => {
    it('calls fn_admin_get_dlq_entries with unresolvedOnly=true by default', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getDLQEntries()
      expect(mockRpc).toHaveBeenCalledWith('fn_admin_get_dlq_entries', {
        p_unresolved_only: true,
      })
    })

    it('passes unresolvedOnly=false when requested', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getDLQEntries(false)
      expect(mockRpc).toHaveBeenCalledWith('fn_admin_get_dlq_entries', {
        p_unresolved_only: false,
      })
    })

    it('returns DLQ entries', async () => {
      const entry = { id: DLQ_ID, job_id: 'job-1', battle_id: 'battle-1', contender_id: 'c-1', slot: 'A', error_code: 'TIMEOUT', error_message: 'timed out', attempt_count: 3, payload: {}, resolved_at: null, created_at: '2026-01-01T00:00:00Z' }
      mockRpc.mockResolvedValue({ data: [entry], error: null })
      const result = await repo.getDLQEntries()
      expect(result[0].id).toBe(DLQ_ID)
      expect(result[0].attempt_count).toBe(3)
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('dlq error') })
      await expect(repo.getDLQEntries()).rejects.toThrow('dlq error')
    })
  })

  // ---------------------------------------------------------------------------
  // retryDLQEntry
  // ---------------------------------------------------------------------------
  describe('retryDLQEntry', () => {
    it('calls fn_admin_retry_dlq with p_dead_letter_id', async () => {
      await repo.retryDLQEntry(DLQ_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_admin_retry_dlq', {
        p_dead_letter_id: DLQ_ID,
      })
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('retry error') })
      await expect(repo.retryDLQEntry(DLQ_ID)).rejects.toThrow('retry error')
    })
  })

  // ---------------------------------------------------------------------------
  // getStuckBattles
  // ---------------------------------------------------------------------------
  describe('getStuckBattles', () => {
    it('calls fn_admin_get_stuck_battles with default threshold 30 minutes', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getStuckBattles()
      expect(mockRpc).toHaveBeenCalledWith('fn_admin_get_stuck_battles', {
        p_threshold_minutes: 30,
      })
    })

    it('supports custom threshold', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getStuckBattles(60)
      expect(mockRpc).toHaveBeenCalledWith('fn_admin_get_stuck_battles', {
        p_threshold_minutes: 60,
      })
    })

    it('returns stuck battle records', async () => {
      const battle = { id: 'b-1', slug: 'stuck-battle', title: 'Stuck Battle', status: 'running', updated_at: '2026-01-01T00:00:00Z', stale_seconds: 3600 }
      mockRpc.mockResolvedValue({ data: [battle], error: null })
      const result = await repo.getStuckBattles()
      expect(result[0].stale_seconds).toBe(3600)
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('stuck error') })
      await expect(repo.getStuckBattles()).rejects.toThrow('stuck error')
    })
  })
})
