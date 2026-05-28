import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockRpc } = vi.hoisted(() => ({ mockRpc: vi.fn() }))

vi.mock('@lenserfight/data/supabase', () => ({
  supabase: { rpc: mockRpc },
}))

import { SupabaseApiKeysRepository } from './apiKeysRepository'

const KEY_ID = 'key-uuid-1'
const LENSER_ID = 'lenser-uuid-1'

const rawRow = {
  id: KEY_ID,
  lenser_id: LENSER_ID,
  provider_id: 'anthropic',
  provider_key: 'anthropic',
  provider_name: 'Anthropic',
  label: 'My Key',
  key_suffix: 'abc123',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  revoked_at: null,
}

const expectedKey = {
  id: KEY_ID,
  lenserId: LENSER_ID,
  providerId: 'anthropic',
  providerKey: 'anthropic',
  providerDisplayName: 'Anthropic',
  label: 'My Key',
  keySuffix: 'abc123',
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
  revokedAt: null,
}

describe('SupabaseApiKeysRepository', () => {
  let repo: SupabaseApiKeysRepository

  beforeEach(() => {
    repo = new SupabaseApiKeysRepository()
    vi.clearAllMocks()
    mockRpc.mockResolvedValue({ data: null, error: null })
  })

  // ---------------------------------------------------------------------------
  // getMyKeys
  // ---------------------------------------------------------------------------
  describe('getMyKeys', () => {
    it('calls fn_get_my_api_keys with no parameters', async () => {
      mockRpc.mockResolvedValue({ data: [rawRow], error: null })
      const result = await repo.getMyKeys()
      expect(mockRpc).toHaveBeenCalledWith('fn_get_my_api_keys')
      expect(result).toEqual([expectedKey])
    })

    it('maps snake_case fields to camelCase UserApiKey shape', async () => {
      mockRpc.mockResolvedValue({ data: [rawRow], error: null })
      const [key] = await repo.getMyKeys()
      expect(key.lenserId).toBe(LENSER_ID)
      expect(key.providerDisplayName).toBe('Anthropic')
      expect(key.keySuffix).toBe('abc123')
      expect(key.isActive).toBe(true)
      expect(key.createdAt).toBe('2026-01-01T00:00:00Z')
      expect(key.revokedAt).toBeNull()
    })

    it('handles null label gracefully', async () => {
      mockRpc.mockResolvedValue({ data: [{ ...rawRow, label: null }], error: null })
      const [key] = await repo.getMyKeys()
      expect(key.label).toBeNull()
    })

    it('returns empty array when data is null', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.getMyKeys()).toEqual([])
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('keys error') })
      await expect(repo.getMyKeys()).rejects.toThrow('keys error')
    })
  })

  // ---------------------------------------------------------------------------
  // storeKey
  // ---------------------------------------------------------------------------
  describe('storeKey', () => {
    it('calls fn_store_api_key with p_provider, p_label, and p_raw_key', async () => {
      mockRpc.mockResolvedValue({ data: KEY_ID, error: null })
      const result = await repo.storeKey({
        provider: 'anthropic',
        label: 'My Key',
        rawKey: 'sk-ant-abc123',
      })
      expect(mockRpc).toHaveBeenCalledWith('fn_store_api_key', {
        p_provider: 'anthropic',
        p_label: 'My Key',
        p_raw_key: 'sk-ant-abc123',
      })
      expect(result).toBe(KEY_ID)
    })

    it('passes null for label when not provided', async () => {
      mockRpc.mockResolvedValue({ data: KEY_ID, error: null })
      await repo.storeKey({ provider: 'openai', rawKey: 'sk-openai-xyz' })
      expect(mockRpc).toHaveBeenCalledWith('fn_store_api_key', expect.objectContaining({ p_label: null }))
    })

    it('uses p_raw_key parameter name (not p_key or p_api_key)', async () => {
      mockRpc.mockResolvedValue({ data: KEY_ID, error: null })
      await repo.storeKey({ provider: 'anthropic', rawKey: 'sk-raw' })
      const params = mockRpc.mock.calls[0][1]
      expect(params).toHaveProperty('p_raw_key')
      expect(params).not.toHaveProperty('p_key')
      expect(params).not.toHaveProperty('p_api_key')
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('store error') })
      await expect(repo.storeKey({ provider: 'anthropic', rawKey: 'sk-x' })).rejects.toThrow('store error')
    })
  })

  // ---------------------------------------------------------------------------
  // revokeKey
  // ---------------------------------------------------------------------------
  describe('revokeKey', () => {
    it('calls fn_revoke_api_key with p_key_id', async () => {
      await repo.revokeKey(KEY_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_revoke_api_key', { p_key_id: KEY_ID })
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('revoke error') })
      await expect(repo.revokeKey(KEY_ID)).rejects.toThrow('revoke error')
    })
  })
})
