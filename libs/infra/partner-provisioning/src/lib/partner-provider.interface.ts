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

export interface IPartnerProvider {
  readonly name: string
  readonly displayName: string
  provision(user: { id: string; email: string; displayName: string }): Promise<PartnerProvision>
  getBalance(externalId: string): Promise<PartnerBalance>
  refreshToken(externalId: string): Promise<PartnerTokenRefreshResult>
  sendClaimEmail(externalId: string): Promise<void>
}
