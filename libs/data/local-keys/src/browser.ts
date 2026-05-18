// Browser-safe entry point. apps/web imports from here.
// No Node imports — fetch and sessionStorage only.

export type {
  AddLocalKeyInput,
  DoctorReport,
  LocalKeyMetadata,
  LocalKeyStoreErrorCode,
  LocalKeyStorePort,
  UpdateLocalKeyInput,
} from './lib/ports'
export { LocalKeyStoreError } from './lib/ports'

export {
  LocalKeysGatewayClient,
  SESSION_TOKEN_KEY,
  SESSION_GATEWAY_URL_KEY,
  DEFAULT_GATEWAY_URL,
  DEFAULT_GATEWAY_PORT,
  deriveGatewayUrl,
} from './lib/browser/gateway-client'
export type { GatewayClientOptions } from './lib/browser/gateway-client'
