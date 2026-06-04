// Capability-driven connector types.
// Replaces the provisioning-centric IPartnerProvider / PartnerProvision model.
// Chainabit is an OAuth capability connector, not a provisioned partner account.

export interface ProviderBalance {
  credits: number
  subscriptionCredits: number
  purchasedCredits: number
  currency: string
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

/** Connection state for a capability connector (replaces PartnerConnectionState). */
export type ProviderConnectionState =
  | 'loading'
  | 'connected'
  | 'no_credits'
  | 'not_connected'
  | 'token_expired'
  | 'insufficient_scope'
  | 'provider_error'
  /** Chainabit OAuth identity is linked to a different LenserFight account. */
  | 'identity_conflict'

// ---------------------------------------------------------------------------
// Back-compat aliases — keep existing consumers compiling during migration.
// @deprecated: use ProviderBalance
export type PartnerBalance = ProviderBalance
// @deprecated: use ProviderConnectionState
export type PartnerConnectionState = ProviderConnectionState
