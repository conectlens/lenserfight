import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockRpc } = vi.hoisted(() => ({ mockRpc: vi.fn() }))

vi.mock('@lenserfight/data/supabase', () => ({
  supabase: { rpc: mockRpc },
}))

import { SupabaseAnalyticsRepository } from './analyticsRepository'

describe('SupabaseAnalyticsRepository', () => {
  let repo: SupabaseAnalyticsRepository

  beforeEach(() => {
    repo = new SupabaseAnalyticsRepository()
    vi.clearAllMocks()
    mockRpc.mockResolvedValue({ data: null, error: null })
  })

  describe('logPageView', () => {
    it('calls fn_log_page_view with all dto fields', async () => {
      await repo.logPageView({
        targetType: 'lens',
        targetId: 'lens-1',
        path: '/lenses/my-lens',
        referrer: 'https://google.com',
        userAgent: 'Mozilla/5.0',
        clientIp: '1.2.3.4',
      })
      expect(mockRpc).toHaveBeenCalledWith('fn_log_page_view', {
        p_target_type: 'lens',
        p_target_id: 'lens-1',
        p_path: '/lenses/my-lens',
        p_referrer: 'https://google.com',
        p_user_agent: 'Mozilla/5.0',
        p_client_ip: '1.2.3.4',
      })
    })

    it('passes null for absent optional fields', async () => {
      await repo.logPageView({
        targetType: 'page',
        path: '/about',
        userAgent: 'Mozilla/5.0',
      })
      expect(mockRpc).toHaveBeenCalledWith('fn_log_page_view', expect.objectContaining({
        p_target_id: null,
        p_referrer: null,
        p_client_ip: null,
      }))
    })

    it('swallows errors silently (console.error only)', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('log error') })
      await expect(repo.logPageView({ targetType: 'page', path: '/home', userAgent: 'Mozilla/5.0' })).resolves.toBeUndefined()
    })
  })
})
