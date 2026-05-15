export type PartnerConnectionState =
  | 'loading'
  | 'no_account'
  | 'invalid_connection'
  | 'no_credits'
  | 'connected'
  | 'provider_error'

/** @deprecated Use PartnerConnectionState */
export type ChainabitConnectionState = PartnerConnectionState

export interface PartnerAiModel {
  id: string
  modelKey: string
  name: string
  provider: string
  providerDisplayName?: string
  capabilities: string[]
  active: boolean
  costPer1kTokens?: number
}

/** @deprecated Use PartnerAiModel */
export type ChainabitAiModel = PartnerAiModel

export interface PartnerProvisionRecord {
  partnerName: string
  displayName: string
  accountId: string | null
  tokenScopes: string[]
  starterCredits: number
}

export interface PartnerBalance {
  credits: number
  accountId: string
  currency: string
}

export interface PartnerTokenRefreshResult {
  token: string
}
