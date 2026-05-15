import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockPartnerApiClient } = vi.hoisted(() => ({
  mockPartnerApiClient: {
    provision: vi.fn(),
    getBalance: vi.fn(),
    refreshToken: vi.fn(),
    sendClaimEmail: vi.fn(),
    getAiModels: vi.fn(),
    revokeToken: vi.fn(),
    startOAuthConnect: vi.fn(),
  },
}))

vi.mock('@lenserfight/infra/partner-provisioning', () => ({
  partnerApiClient: mockPartnerApiClient,
}))

import { partnerProvisioningRepository } from './partnerProvisioningRepository'

const PARTNER = 'chainabit'

describe('partnerProvisioningRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('provision', () => {
    it('delegates to partnerApiClient.provision with partner name', async () => {
      const record = { partnerId: PARTNER, status: 'active', createdAt: '2026-01-01' }
      mockPartnerApiClient.provision.mockResolvedValue(record)
      const result = await partnerProvisioningRepository.provision(PARTNER)
      expect(mockPartnerApiClient.provision).toHaveBeenCalledWith(PARTNER)
      expect(result).toEqual(record)
    })

    it('propagates errors', async () => {
      mockPartnerApiClient.provision.mockRejectedValue(new Error('provision failed'))
      await expect(partnerProvisioningRepository.provision(PARTNER)).rejects.toThrow('provision failed')
    })
  })

  describe('getBalance', () => {
    it('delegates to partnerApiClient.getBalance', async () => {
      const balance = { credits: 1000, currency: 'USD' }
      mockPartnerApiClient.getBalance.mockResolvedValue(balance)
      const result = await partnerProvisioningRepository.getBalance(PARTNER)
      expect(mockPartnerApiClient.getBalance).toHaveBeenCalledWith(PARTNER)
      expect(result).toEqual(balance)
    })

    it('propagates not_provisioned errors so callers can detect unprovision state', async () => {
      const err = Object.assign(new Error('Not found'), { error: 'not_provisioned' })
      mockPartnerApiClient.getBalance.mockRejectedValue(err)
      await expect(partnerProvisioningRepository.getBalance(PARTNER)).rejects.toMatchObject({ error: 'not_provisioned' })
    })
  })

  describe('refreshToken', () => {
    it('delegates to partnerApiClient.refreshToken', async () => {
      const refresh = { token: 'new-token', expiresAt: '2026-12-31' }
      mockPartnerApiClient.refreshToken.mockResolvedValue(refresh)
      const result = await partnerProvisioningRepository.refreshToken(PARTNER)
      expect(mockPartnerApiClient.refreshToken).toHaveBeenCalledWith(PARTNER)
      expect(result).toEqual(refresh)
    })
  })

  describe('sendClaimEmail', () => {
    it('delegates to partnerApiClient.sendClaimEmail', async () => {
      mockPartnerApiClient.sendClaimEmail.mockResolvedValue(undefined)
      await partnerProvisioningRepository.sendClaimEmail(PARTNER)
      expect(mockPartnerApiClient.sendClaimEmail).toHaveBeenCalledWith(PARTNER)
    })

    it('propagates errors', async () => {
      mockPartnerApiClient.sendClaimEmail.mockRejectedValue(new Error('email failed'))
      await expect(partnerProvisioningRepository.sendClaimEmail(PARTNER)).rejects.toThrow('email failed')
    })
  })

  describe('getAiModels', () => {
    it('delegates to partnerApiClient.getAiModels', async () => {
      const models = [{ id: 'm1', name: 'GPT-4', provider: 'openai' }]
      mockPartnerApiClient.getAiModels.mockResolvedValue(models)
      const result = await partnerProvisioningRepository.getAiModels(PARTNER)
      expect(mockPartnerApiClient.getAiModels).toHaveBeenCalledWith(PARTNER)
      expect(result).toEqual(models)
    })

    it('propagates errors', async () => {
      mockPartnerApiClient.getAiModels.mockRejectedValue(new Error('models failed'))
      await expect(partnerProvisioningRepository.getAiModels(PARTNER)).rejects.toThrow('models failed')
    })
  })

  describe('revokeToken', () => {
    it('delegates to partnerApiClient.revokeToken', async () => {
      mockPartnerApiClient.revokeToken.mockResolvedValue(undefined)
      await partnerProvisioningRepository.revokeToken(PARTNER)
      expect(mockPartnerApiClient.revokeToken).toHaveBeenCalledWith(PARTNER)
    })

    it('propagates errors so callers handle revoke failures', async () => {
      mockPartnerApiClient.revokeToken.mockRejectedValue(new Error('revoke failed'))
      await expect(partnerProvisioningRepository.revokeToken(PARTNER)).rejects.toThrow('revoke failed')
    })
  })

  describe('startOAuthConnect', () => {
    it('delegates to partnerApiClient.startOAuthConnect without returnUrl', async () => {
      mockPartnerApiClient.startOAuthConnect.mockResolvedValue(undefined)
      await partnerProvisioningRepository.startOAuthConnect()
      expect(mockPartnerApiClient.startOAuthConnect).toHaveBeenCalledWith(undefined)
    })

    it('forwards returnUrl to partnerApiClient', async () => {
      mockPartnerApiClient.startOAuthConnect.mockResolvedValue(undefined)
      await partnerProvisioningRepository.startOAuthConnect('https://lenserfight.com/settings')
      expect(mockPartnerApiClient.startOAuthConnect).toHaveBeenCalledWith('https://lenserfight.com/settings')
    })

    it('propagates errors', async () => {
      mockPartnerApiClient.startOAuthConnect.mockRejectedValue(new Error('oauth failed'))
      await expect(partnerProvisioningRepository.startOAuthConnect()).rejects.toThrow('oauth failed')
    })
  })
})
