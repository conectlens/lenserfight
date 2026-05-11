import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockPartnerApiClient } = vi.hoisted(() => ({
  mockPartnerApiClient: {
    provision: vi.fn(),
    getBalance: vi.fn(),
    refreshToken: vi.fn(),
    sendClaimEmail: vi.fn(),
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
})
