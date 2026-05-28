import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockRpc } = vi.hoisted(() => ({ mockRpc: vi.fn() }))

vi.mock('@lenserfight/data/supabase', () => ({
  supabase: { rpc: mockRpc },
}))

import { SupabaseNotificationsRepository } from './notificationsRepository'

const NOTIF_1 = 'notif-uuid-1'
const NOTIF_2 = 'notif-uuid-2'

const fakeNotification = {
  id: NOTIF_1,
  type: 'battle_started',
  lenser_id: 'lenser-1',
  is_read: false,
  created_at: '2026-01-01T00:00:00Z',
  payload: {},
}

describe('SupabaseNotificationsRepository', () => {
  let repo: SupabaseNotificationsRepository

  beforeEach(() => {
    repo = new SupabaseNotificationsRepository()
    vi.clearAllMocks()
    mockRpc.mockResolvedValue({ data: null, error: null })
  })

  // ---------------------------------------------------------------------------
  // getNotifications
  // ---------------------------------------------------------------------------
  describe('getNotifications', () => {
    it('calls fn_get_notifications with default limit 20 and null cursor', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getNotifications()
      expect(mockRpc).toHaveBeenCalledWith('fn_get_notifications', {
        p_limit: 20,
        p_cursor: null,
      })
    })

    it('passes custom limit and cursor', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getNotifications(50, 'cursor-xyz')
      expect(mockRpc).toHaveBeenCalledWith('fn_get_notifications', {
        p_limit: 50,
        p_cursor: 'cursor-xyz',
      })
    })

    it('enforces limit (does not allow unbounded reads)', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getNotifications()
      expect(mockRpc).toHaveBeenCalledWith('fn_get_notifications', expect.objectContaining({ p_limit: 20 }))
    })

    it('returns notifications array', async () => {
      mockRpc.mockResolvedValue({ data: [fakeNotification], error: null })
      const result = await repo.getNotifications()
      expect(result).toEqual([fakeNotification])
    })

    it('returns empty array when no notifications', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.getNotifications()).toEqual([])
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('notifications error') })
      await expect(repo.getNotifications()).rejects.toThrow('notifications error')
    })
  })

  // ---------------------------------------------------------------------------
  // markRead
  // ---------------------------------------------------------------------------
  describe('markRead', () => {
    it('returns 0 immediately without calling Supabase when given empty array', async () => {
      const result = await repo.markRead([])
      expect(mockRpc).not.toHaveBeenCalled()
      expect(result).toBe(0)
    })

    it('calls fn_mark_notifications_read with p_notification_ids', async () => {
      mockRpc.mockResolvedValue({ data: 2, error: null })
      const result = await repo.markRead([NOTIF_1, NOTIF_2])
      expect(mockRpc).toHaveBeenCalledWith('fn_mark_notifications_read', {
        p_notification_ids: [NOTIF_1, NOTIF_2],
      })
      expect(result).toBe(2)
    })

    it('returns 0 when data is null (no rows updated)', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      const result = await repo.markRead([NOTIF_1])
      expect(result).toBe(0)
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('mark read error') })
      await expect(repo.markRead([NOTIF_1])).rejects.toThrow('mark read error')
    })
  })

  // ---------------------------------------------------------------------------
  // getUnreadCount
  // ---------------------------------------------------------------------------
  describe('getUnreadCount', () => {
    it('calls fn_get_unread_notification_count', async () => {
      mockRpc.mockResolvedValue({ data: 5, error: null })
      const result = await repo.getUnreadCount()
      expect(mockRpc).toHaveBeenCalledWith('fn_get_unread_notification_count')
      expect(result).toBe(5)
    })

    it('returns 0 when data is null', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.getUnreadCount()).toBe(0)
    })

    it('returns 0 when count is 0', async () => {
      mockRpc.mockResolvedValue({ data: 0, error: null })
      expect(await repo.getUnreadCount()).toBe(0)
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('count error') })
      await expect(repo.getUnreadCount()).rejects.toThrow('count error')
    })
  })
})
