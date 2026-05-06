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
