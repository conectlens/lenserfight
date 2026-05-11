import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockRpc } = vi.hoisted(() => ({ mockRpc: vi.fn() }))

vi.mock('@lenserfight/data/supabase', () => ({
  supabase: { rpc: mockRpc },
}))

import { SupabaseGatewayDeviceRepository } from './gatewayDeviceRepository'

const DEVICE_ID = 'device-uuid-1'

describe('SupabaseGatewayDeviceRepository', () => {
  let repo: SupabaseGatewayDeviceRepository

  beforeEach(() => {
    repo = new SupabaseGatewayDeviceRepository()
    vi.clearAllMocks()
    mockRpc.mockResolvedValue({ data: null, error: null })
  })

  // ---------------------------------------------------------------------------
  // list
  // ---------------------------------------------------------------------------
  describe('list', () => {
    it('calls fn_device_list with null trust_level and limit=100 by default', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.list()
      expect(mockRpc).toHaveBeenCalledWith('fn_device_list', { p_trust_level: null, p_limit: 100 })
    })

    it('passes trustLevel when provided', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.list({ trustLevel: 'verified' })
      expect(mockRpc).toHaveBeenCalledWith('fn_device_list', { p_trust_level: 'verified', p_limit: 100 })
    })

    it('returns devices from RPC', async () => {
      const device = { id: DEVICE_ID, name: 'MyDevice', trust_level: 'verified' }
      mockRpc.mockResolvedValue({ data: [device], error: null })
      const result = await repo.list()
      expect(result).toHaveLength(1)
    })

    it('returns empty array when data is null', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.list()).toEqual([])
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('list error') })
      await expect(repo.list()).rejects.toThrow('list error')
    })
  })

  // ---------------------------------------------------------------------------
  // registerWithKey
  // ---------------------------------------------------------------------------
  describe('registerWithKey', () => {
    it('calls fn_device_register_with_key with all params', async () => {
      const row = { device_id: DEVICE_ID, challenge_id: 'ch-1', challenge_nonce: 'nonce', challenge_expires_at: '2026-01-01T01:00:00Z' }
      mockRpc.mockResolvedValue({ data: [row], error: null })
      const result = await repo.registerWithKey({ name: 'MyDevice', publicKey: 'pk-xxx', deviceType: 'desktop', os: 'linux', arch: 'x64', cliVersion: '1.0', daemonVersion: '1.0', capabilities: { gpu: true } })
      expect(mockRpc).toHaveBeenCalledWith('fn_device_register_with_key', {
        p_name: 'MyDevice',
        p_public_key: 'pk-xxx',
        p_device_type: 'desktop',
        p_os: 'linux',
        p_arch: 'x64',
        p_cli_version: '1.0',
        p_daemon_version: '1.0',
        p_capabilities: { gpu: true },
      })
      expect(result.deviceId).toBe(DEVICE_ID)
      expect(result.challengeNonce).toBe('nonce')
    })

    it('uses defaults for optional fields', async () => {
      const row = { device_id: DEVICE_ID, challenge_id: 'ch-1', challenge_nonce: 'n', challenge_expires_at: '2026-01-01T01:00:00Z' }
      mockRpc.mockResolvedValue({ data: [row], error: null })
      await repo.registerWithKey({ name: 'Dev', publicKey: 'pk' })
      expect(mockRpc).toHaveBeenCalledWith('fn_device_register_with_key', expect.objectContaining({
        p_device_type: 'other',
        p_os: null,
        p_capabilities: {},
      }))
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('register error') })
      await expect(repo.registerWithKey({ name: 'D', publicKey: 'p' })).rejects.toThrow('register error')
    })
  })

  // ---------------------------------------------------------------------------
  // postChallenge
  // ---------------------------------------------------------------------------
  describe('postChallenge', () => {
    it('calls fn_device_post_challenge and returns token string', async () => {
      mockRpc.mockResolvedValue({ data: 'jwt-token-abc', error: null })
      const result = await repo.postChallenge({ deviceId: DEVICE_ID, signature: 'sig-xxx' })
      expect(mockRpc).toHaveBeenCalledWith('fn_device_post_challenge', expect.objectContaining({
        p_device_id: DEVICE_ID,
        p_signature: 'sig-xxx',
      }))
      expect(result).toBe('jwt-token-abc')
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('challenge error') })
      await expect(repo.postChallenge({ deviceId: DEVICE_ID, signature: 'sig' })).rejects.toThrow('challenge error')
    })
  })

  // ---------------------------------------------------------------------------
  // approve / revoke
  // ---------------------------------------------------------------------------
  describe('approve', () => {
    it('calls fn_device_approve with p_device_id', async () => {
      await repo.approve(DEVICE_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_device_approve', { p_device_id: DEVICE_ID })
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('approve error') })
      await expect(repo.approve(DEVICE_ID)).rejects.toThrow('approve error')
    })
  })

  describe('revoke', () => {
    it('calls fn_device_revoke with p_device_id', async () => {
      await repo.revoke(DEVICE_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_device_revoke', { p_device_id: DEVICE_ID })
    })
  })

  // ---------------------------------------------------------------------------
  // heartbeat
  // ---------------------------------------------------------------------------
  describe('heartbeat', () => {
    it('calls fn_device_heartbeat with all fields', async () => {
      await repo.heartbeat({ deviceId: DEVICE_ID, daemonVersion: '1.2', envelopeSig: 'sig', gatewayStatus: 'connected' })
      expect(mockRpc).toHaveBeenCalledWith('fn_device_heartbeat', {
        p_device_id: DEVICE_ID,
        p_daemon_version: '1.2',
        p_envelope_sig: 'sig',
        p_gateway_status: 'connected',
      })
    })

    it('defaults gatewayStatus to "connected" when absent', async () => {
      await repo.heartbeat({ deviceId: DEVICE_ID })
      expect(mockRpc).toHaveBeenCalledWith('fn_device_heartbeat', expect.objectContaining({
        p_daemon_version: null,
        p_gateway_status: 'connected',
      }))
    })
  })
})
