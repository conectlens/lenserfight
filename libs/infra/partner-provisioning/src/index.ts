// Public API for the provider connector infra lib.
// Library rename: infra-partner-provisioning → infra-provider-connectors is tracked as a follow-up.

export type {
  ChainabitAiModel,
  ProviderBalance,
  ProviderConnectionState,
  // Back-compat aliases kept so existing consumers compile without changes
  PartnerBalance,
  PartnerConnectionState,
} from './lib/partner-provider.interface'

export {
  connectorApiClient,
  isChainabitConnected,
  parseOAuthErrorCodeFromLocation,
  stripOAuthErrorParamsFromLocation,
  // Back-compat alias — migrate call sites to connectorApiClient
  partnerApiClient,
} from './lib/partner-api-client'

export type {
  // @deprecated — provisioning removed; these are `never` placeholders
  PartnerProvisionRecord,
  ChainabitOAuthState,
} from './lib/partner-api-client'
