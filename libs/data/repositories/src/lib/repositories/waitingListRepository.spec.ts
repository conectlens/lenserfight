import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockRpc } = vi.hoisted(() => ({ mockRpc: vi.fn() }))

vi.mock('@lenserfight/data/supabase', () => ({
  supabase: { rpc: mockRpc },
}))

import { SupabaseWaitingListRepository } from './waitingListRepository'

describe('SupabaseWaitingListRepository', () => {
  let repo: SupabaseWaitingListRepository

  beforeEach(() => {
    repo = new SupabaseWaitingListRepository()
    vi.clearAllMocks()
    mockRpc.mockResolvedValue({ data: null, error: null })
  })

  // ---------------------------------------------------------------------------
  // getIsInWaitingList
  // ---------------------------------------------------------------------------
  describe('getIsInWaitingList', () => {
    it('calls fn_lensers_get_is_in_waitinglist with no params', async () => {
      mockRpc.mockResolvedValue({ data: true, error: null })
      const result = await repo.getIsInWaitingList()
      expect(mockRpc).toHaveBeenCalledWith('fn_lensers_get_is_in_waitinglist')
      expect(result).toBe(true)
    })

    it('returns false when not in waiting list', async () => {
      mockRpc.mockResolvedValue({ data: false, error: null })
      expect(await repo.getIsInWaitingList()).toBe(false)
    })

    it('returns null when data is null', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.getIsInWaitingList()).toBeNull()
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('rpc error') })
      await expect(repo.getIsInWaitingList()).rejects.toThrow('rpc error')
    })
  })

  // ---------------------------------------------------------------------------
  // toggleWaitingList
  // ---------------------------------------------------------------------------
  describe('toggleWaitingList', () => {
    it('calls fn_lensers_toggle_waitinglist with p_kvkk_approved', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      const result = await repo.toggleWaitingList(true)
      expect(mockRpc).toHaveBeenCalledWith('fn_lensers_toggle_waitinglist', {
        p_kvkk_approved: true,
      })
      expect(result).toBe(true)
    })

    it('throws "KVKK approval is required." for kvkk_not_approved error', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { message: 'kvkk_not_approved' } })
      await expect(repo.toggleWaitingList(false)).rejects.toThrow('KVKK approval is required.')
    })

    it('throws "You must be logged in." for not_authenticated error', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { message: 'not_authenticated' } })
      await expect(repo.toggleWaitingList(true)).rejects.toThrow('You must be logged in.')
    })

    it('throws "Only lensers can join the waiting list." for not_a_lenser error', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { message: 'not_a_lenser' } })
      await expect(repo.toggleWaitingList(true)).rejects.toThrow('Only lensers can join the waiting list.')
    })

    it('rethrows unknown errors by message', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { message: 'some other db error' } })
      await expect(repo.toggleWaitingList(true)).rejects.toThrow('some other db error')
    })
  })
})
