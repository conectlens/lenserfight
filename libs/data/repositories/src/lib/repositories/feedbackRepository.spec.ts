import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockRpc } = vi.hoisted(() => ({ mockRpc: vi.fn() }))

vi.mock('@lenserfight/data/supabase', () => ({
  supabase: { rpc: mockRpc },
}))

import { SupabaseFeedbackRepository } from './feedbackRepository'

describe('SupabaseFeedbackRepository', () => {
  let repo: SupabaseFeedbackRepository

  beforeEach(() => {
    repo = new SupabaseFeedbackRepository()
    vi.clearAllMocks()
    mockRpc.mockResolvedValue({ data: null, error: null })
  })

  // ---------------------------------------------------------------------------
  // submitFeedback
  // ---------------------------------------------------------------------------
  describe('submitFeedback', () => {
    it('calls fn_analytics_submit_feedback with all fields', async () => {
      await repo.submitFeedback({
        product_tag: 'battles',
        page: '/battles',
        message: 'This is a valid feedback message with enough characters.',
        start_date: '2026-01-01',
        end_date: '2026-01-31',
      })
      expect(mockRpc).toHaveBeenCalledWith('fn_analytics_submit_feedback', {
        p_product_tag: 'battles',
        p_page: '/battles',
        p_message: 'This is a valid feedback message with enough characters.',
        p_start_date: '2026-01-01',
        p_end_date: '2026-01-31',
      })
    })

    it('uses "general" default for product_tag when not provided', async () => {
      await repo.submitFeedback({ message: 'Feedback message here ok.' })
      expect(mockRpc).toHaveBeenCalledWith('fn_analytics_submit_feedback', expect.objectContaining({
        p_product_tag: 'general',
      }))
    })

    it('throws when message is shorter than 10 characters', async () => {
      await expect(repo.submitFeedback({ message: 'short' })).rejects.toThrow(
        'Feedback message must be between 10 and 2000 characters.'
      )
      expect(mockRpc).not.toHaveBeenCalled()
    })

    it('throws when message is longer than 2000 characters', async () => {
      await expect(repo.submitFeedback({ message: 'x'.repeat(2001) })).rejects.toThrow(
        'Feedback message must be between 10 and 2000 characters.'
      )
      expect(mockRpc).not.toHaveBeenCalled()
    })

    it('does not validate when message is null', async () => {
      await repo.submitFeedback({ message: null as any })
      expect(mockRpc).toHaveBeenCalled()
    })

    it('rethrows errors from RPC', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('rpc error') })
      await expect(repo.submitFeedback({ message: 'Valid feedback message here.' })).rejects.toThrow('rpc error')
    })
  })

  // ---------------------------------------------------------------------------
  // getUserFeedbacks
  // ---------------------------------------------------------------------------
  describe('getUserFeedbacks', () => {
    it('calls fn_analytics_product_feedback_list_user_paginated with offset and limit', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getUserFeedbacks(0, 5)
      expect(mockRpc).toHaveBeenCalledWith('fn_analytics_product_feedback_list_user_paginated', {
        p_offset: 0,
        p_limit: 5,
      })
    })

    it('maps rows to Feedback shape and returns pagination envelope', async () => {
      const row = {
        product_tag: 'battles',
        page: '/battles',
        message: 'Great feature!',
        start_date: null,
        end_date: null,
        status: 'pending',
        created_at: '2026-01-01T00:00:00Z',
        total_count: 1,
      }
      mockRpc.mockResolvedValue({ data: [row], error: null })
      const result = await repo.getUserFeedbacks(0, 5)
      expect(result.data).toHaveLength(1)
      expect(result.data[0].product_tag).toBe('battles')
      expect(result.data[0].message).toBe('Great feature!')
      expect(result).toHaveProperty('meta')
    })

    it('returns empty envelope when data is null', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      const result = await repo.getUserFeedbacks()
      expect(result.data).toEqual([])
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('list error') })
      await expect(repo.getUserFeedbacks()).rejects.toThrow('list error')
    })
  })
})
