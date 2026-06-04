export type PartnerConnectionState =
  | 'loading'
  | 'connected'
  | 'no_credits'
  | 'not_connected'
  | 'token_expired'
  | 'insufficient_scope'
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
  currency: string
}

export interface PartnerTokenRefreshResult {
  token: string
}
