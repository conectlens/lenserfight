import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockRpc } = vi.hoisted(() => ({ mockRpc: vi.fn() }))

vi.mock('@lenserfight/data/supabase', () => ({
  supabase: { rpc: mockRpc },
}))

import { SupabaseGatewaySyncRepository } from './gatewaySyncRepository'

const DEVICE_ID = 'device-uuid-1'

describe('SupabaseGatewaySyncRepository', () => {
  let repo: SupabaseGatewaySyncRepository

  beforeEach(() => {
    repo = new SupabaseGatewaySyncRepository()
    vi.clearAllMocks()
    mockRpc.mockResolvedValue({ data: null, error: null })
  })

  // ---------------------------------------------------------------------------
  // push
  // ---------------------------------------------------------------------------
  describe('push', () => {
    it('calls fn_sync_push with envelope and maps response', async () => {
      const row = { applied_count: 3, rejected_count: 1, rejections: ['entry-2'] }
      mockRpc.mockResolvedValue({ data: [row], error: null })
      const envelope = { deviceId: DEVICE_ID, payload: { entries: [] }, sig: 'sig' } as any
      const result = await repo.push(envelope)
      expect(mockRpc).toHaveBeenCalledWith('fn_sync_push', { p_envelope: envelope })
      expect(result.appliedCount).toBe(3)
      expect(result.rejectedCount).toBe(1)
    })

    it('defaults counts to 0 when row is null', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      const result = await repo.push({} as any)
      expect(result.appliedCount).toBe(0)
      expect(result.rejectedCount).toBe(0)
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('push error') })
      await expect(repo.push({} as any)).rejects.toThrow('push error')
    })
  })

  // ---------------------------------------------------------------------------
  // pull
  // ---------------------------------------------------------------------------
  describe('pull', () => {
    it('calls fn_sync_pull with envelope, objectClasses and default limit 100', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      const envelope = { deviceId: DEVICE_ID } as any
      await repo.pull({ envelope, objectClasses: ['memory_entry'] })
      expect(mockRpc).toHaveBeenCalledWith('fn_sync_pull', {
        p_envelope: envelope,
        p_object_classes: ['memory_entry'],
        p_limit: 100,
      })
    })

    it('passes custom limit when provided', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.pull({ envelope: {} as any, objectClasses: ['memory_entry'], limit: 50 })
      expect(mockRpc).toHaveBeenCalledWith('fn_sync_pull', expect.objectContaining({ p_limit: 50 }))
    })

    it('returns entries from RPC', async () => {
      const entry = { id: 'e-1', object_class: 'memory_entry', object_id: 'obj-1', op: 'upsert', payload: {}, vclock: {}, created_at: '2026-01-01' }
      mockRpc.mockResolvedValue({ data: [entry], error: null })
      const result = await repo.pull({ envelope: {} as any, objectClasses: ['memory_entry'] })
      expect(result).toHaveLength(1)
      expect(result[0].op).toBe('upsert')
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('pull error') })
      await expect(repo.pull({ envelope: {} as any, objectClasses: [] })).rejects.toThrow('pull error')
    })
  })

  // ---------------------------------------------------------------------------
  // status
  // ---------------------------------------------------------------------------
  describe('status', () => {
    it('calls fn_sync_status with p_device_id and maps rows', async () => {
      const row = { object_class: 'memory_entry', watermark: 'ts123', outbox_depth: '5', last_error: null }
      mockRpc.mockResolvedValue({ data: [row], error: null })
      const result = await repo.status(DEVICE_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_sync_status', { p_device_id: DEVICE_ID })
      expect(result[0].outbox_depth).toBe(5)
      expect(result[0].watermark).toBe('ts123')
    })

    it('returns empty array when data is null', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.status(DEVICE_ID)).toEqual([])
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('status error') })
      await expect(repo.status(DEVICE_ID)).rejects.toThrow('status error')
    })
  })

  // ---------------------------------------------------------------------------
  // acquireLeaderLease
  // ---------------------------------------------------------------------------
  describe('acquireLeaderLease', () => {
    it('calls fn_acquire_leader_lease with all params and default leaseSeconds=30', async () => {
      const row = { holder_device_id: DEVICE_ID, holder_acquired: true, expires_at: '2026-01-01T00:00:30Z' }
      mockRpc.mockResolvedValue({ data: [row], error: null })
      const result = await repo.acquireLeaderLease({ leaseKind: 'battle_runner', deviceId: DEVICE_ID })
      expect(mockRpc).toHaveBeenCalledWith('fn_acquire_leader_lease', {
        p_lease_kind: 'battle_runner',
        p_device_id: DEVICE_ID,
        p_lease_seconds: 30,
      })
      expect(result.holderDeviceId).toBe(DEVICE_ID)
      expect(result.holderAcquired).toBe(true)
    })

    it('supports custom leaseSeconds', async () => {
      const row = { holder_device_id: DEVICE_ID, holder_acquired: false, expires_at: '2026-01-01T00:01:00Z' }
      mockRpc.mockResolvedValue({ data: [row], error: null })
      await repo.acquireLeaderLease({ leaseKind: 'runner', deviceId: DEVICE_ID, leaseSeconds: 60 })
      expect(mockRpc).toHaveBeenCalledWith('fn_acquire_leader_lease', expect.objectContaining({
        p_lease_seconds: 60,
      }))
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('lease error') })
      await expect(repo.acquireLeaderLease({ leaseKind: 'r', deviceId: DEVICE_ID })).rejects.toThrow('lease error')
    })
  })

  // ---------------------------------------------------------------------------
  // resolveConflict
  // ---------------------------------------------------------------------------
  describe('resolveConflict', () => {
    it('calls fn_sync_resolve_conflict with outboxId and winner', async () => {
      await repo.resolveConflict({ outboxId: 'outbox-1', winner: { id: 'v2', data: 'final' } })
      expect(mockRpc).toHaveBeenCalledWith('fn_sync_resolve_conflict', {
        p_outbox_id: 'outbox-1',
        p_winner: { id: 'v2', data: 'final' },
      })
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('conflict error') })
      await expect(repo.resolveConflict({ outboxId: 'o-1', winner: {} })).rejects.toThrow('conflict error')
    })
  })
})
