import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockRpc } = vi.hoisted(() => ({ mockRpc: vi.fn() }))

vi.mock('@lenserfight/data/supabase', () => ({
  supabase: { rpc: mockRpc },
}))

import { SupabaseContactRepository } from './contactRepository'

describe('SupabaseContactRepository', () => {
  let repo: SupabaseContactRepository

  beforeEach(() => {
    repo = new SupabaseContactRepository()
    vi.clearAllMocks()
    mockRpc.mockResolvedValue({ data: null, error: null })
  })

  describe('submitMessage', () => {
    it('calls fn_ops_submit_contact with all dto fields', async () => {
      await repo.submitMessage({
        name: 'Alice',
        email: 'alice@example.com',
        subject: 'Question',
        message: 'Hello there',
        kvkk_approved: true,
        ip_address: '1.2.3.4',
        user_agent: 'Mozilla/5.0',
      })
      expect(mockRpc).toHaveBeenCalledWith('fn_ops_submit_contact', {
        p_name: 'Alice',
        p_email: 'alice@example.com',
        p_subject: 'Question',
        p_message: 'Hello there',
        p_kvkk_approved: true,
        p_ip_address: '1.2.3.4',
        p_user_agent: 'Mozilla/5.0',
      })
    })

    it('passes null for absent optional fields', async () => {
      await repo.submitMessage({
        name: 'Alice',
        email: 'alice@example.com',
        subject: 'Hi',
        message: 'msg',
        kvkk_approved: true,
      })
      expect(mockRpc).toHaveBeenCalledWith('fn_ops_submit_contact', expect.objectContaining({
        p_ip_address: null,
        p_user_agent: null,
      }))
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('submit error') })
      await expect(repo.submitMessage({ name: 'A', email: 'a@b.com', subject: 'S', message: 'M', kvkk_approved: true })).rejects.toThrow('submit error')
    })
  })
})
