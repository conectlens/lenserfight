export type ChainabitConnectionState =
  | 'loading'
  | 'no_account'
  | 'invalid_connection'
  | 'no_credits'
  | 'connected'
  | 'provider_error'

export interface ChainabitAiModel {
  id: string
  modelKey: string
  name: string
  provider: string
  providerDisplayName?: string
  capabilities: string[]
  active: boolean
  costPer1kTokens?: number
}

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
