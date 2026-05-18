// ── Types ────────────────────────────────────────────────────────────────────
export type {
  ConnectorProvider,
  OAuthProvider,
  ConnectorCapability,
  OAuthCapability,
  GoogleCapability,
  ConnectorAuthStrategy,
  ConnectorAvailability,
  ConnectorCapabilityDefinition,
  ConnectorProviderDefinition,
  ConnectorOperationDefinition,
  OAuthCapabilityDefinition,
  OAuthProviderDefinition,
  UserOAuthConnection,
  ConnectorRef,
  ConnectorRefParseResult,
  OAuthStatePayload,
} from './lib/oauth-connection.types'

// ── Connector reference parser ───────────────────────────────────────────────
export {
  CONNECTOR_REF_OUTER_RE,
  extractConnectorRefs,
  hasConnectorRef,
  parseConnectorRef,
} from './lib/connector-ref.parser'

// ── Provider registry ────────────────────────────────────────────────────────
export {
  registerOAuthProvider,
  updateOAuthProvider,
  getOAuthProvider,
  listOAuthProviders,
  getOAuthCapabilityDefinition,
  isRegisteredOAuthProvider,
  isRegisteredOAuthCapability,
} from './lib/provider.registry'

// ── Built-in providers ───────────────────────────────────────────────────────
export { googleProvider, GOOGLE_CAPABILITIES } from './lib/providers/google.provider'
export { automationProviders } from './lib/providers/automation.providers'
