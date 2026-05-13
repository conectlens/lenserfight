export interface PartnerProvision {
  externalId: string
  accountId: string
  token: string | null
  tokenScopes: string[]
  starterCredits: number
  isNew: boolean
}

export interface PartnerBalance {
  credits: number
  accountId: string
  currency: string
}

export interface PartnerTokenRefreshResult {
  token: string
}

export interface ChainabitAiModel {
  id: string
  modelKey: string
  name: string
  provider: string
  capabilities: string[]
  active: boolean
  costPer1kTokens?: number
}

export interface IPartnerProvider {
  readonly name: string
  readonly displayName: string
  provision(user: { id: string; email: string; displayName: string }): Promise<PartnerProvision>
  getBalance(externalId: string): Promise<PartnerBalance>
  refreshToken(externalId: string): Promise<PartnerTokenRefreshResult>
  sendClaimEmail(externalId: string): Promise<void>
  /** Uses the developer token (wallet:read scope) to fetch balance from the provider's own wallet API. */
  getBalanceWithToken?(developerToken: string): Promise<PartnerBalance>
  /** Uses the developer token (execution:run scope) to fetch available AI models. */
  getAiModels?(developerToken: string): Promise<ChainabitAiModel[]>
  /** Revokes the developer token via the provider's OAuth revoke endpoint. */
  revokeToken?(developerToken: string): Promise<void>
}
