export { CONNECTOR_SCOPES, isConnectorScope, validateScopes, parseScopesCsv } from './lib/scopes'
export type { ConnectorScope, ScopeValidationResult } from './lib/scopes'

export type {
  ConnectorKind,
  ConnectorMetadata,
  DispatchEvent,
  DispatchResult,
  VerifyResult,
} from './lib/connector.types'
export { ConnectorScopeError } from './lib/connector.types'

export type { ConnectorAdapter, ConnectorAdapterV1 } from './lib/connector-adapter'

export {
  registerConnectorAdapter,
  unregisterConnectorAdapter,
  getConnectorAdapter,
  setDefaultConnectorAdapter,
  listConnectorAdapters,
  __resetConnectorRegistryForTests,
} from './lib/connector.registry'

export { HttpConnectorAdapter } from './lib/http-connector.adapter'
export type { HttpConnectorAdapterOptions } from './lib/http-connector.adapter'
