import { partnerApiClient } from '@lenserfight/infra/partner-provisioning'
import type { ChainabitAiModel, PartnerBalance, PartnerProvisionRecord, PartnerTokenRefreshResult } from '@lenserfight/types'

export const partnerProvisioningRepository = {
  provision(_partnerName: string): Promise<PartnerProvisionRecord> {
    return Promise.reject(new Error('Not implemented'))
  },

  async getBalance(partnerName: string): Promise<PartnerBalance> {
    const balance = await partnerApiClient.getBalance(partnerName)
    return { ...balance, accountId: '' }
  },

  refreshToken(_partnerName: string): Promise<PartnerTokenRefreshResult> {
    return Promise.reject(new Error('Not implemented'))
  },

  sendClaimEmail(_partnerName: string): Promise<void> {
    return Promise.reject(new Error('Not implemented'))
  },

  getAiModels(partnerName: string): Promise<ChainabitAiModel[]> {
    return partnerApiClient.getAiModels(partnerName)
  },

  revokeToken(partnerName: string): Promise<void> {
    return partnerApiClient.revokeToken(partnerName)
  },

  startOAuthConnect(returnUrl?: string): Promise<void> {
    if (!returnUrl) return Promise.reject(new Error('returnUrl required'))
    return partnerApiClient.startOAuthConnect(returnUrl)
  },
}
