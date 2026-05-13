import { partnerApiClient } from '@lenserfight/infra/partner-provisioning'
import type { ChainabitAiModel, PartnerBalance, PartnerProvisionRecord, PartnerTokenRefreshResult } from '@lenserfight/types'

export const partnerProvisioningRepository = {
  provision(partnerName: string): Promise<PartnerProvisionRecord> {
    return partnerApiClient.provision(partnerName)
  },

  getBalance(partnerName: string): Promise<PartnerBalance> {
    return partnerApiClient.getBalance(partnerName)
  },

  refreshToken(partnerName: string): Promise<PartnerTokenRefreshResult> {
    return partnerApiClient.refreshToken(partnerName)
  },

  sendClaimEmail(partnerName: string): Promise<void> {
    return partnerApiClient.sendClaimEmail(partnerName)
  },

  getAiModels(partnerName: string): Promise<ChainabitAiModel[]> {
    return partnerApiClient.getAiModels(partnerName)
  },

  revokeToken(partnerName: string): Promise<void> {
    return partnerApiClient.revokeToken(partnerName)
  },

  startOAuthConnect(returnUrl?: string): Promise<void> {
    return partnerApiClient.startOAuthConnect(returnUrl)
  },
}
