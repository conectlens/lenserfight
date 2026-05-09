export { assertSafe } from './guard'
export { isCI, isProduction, isLocalMode, detectEnvLabel, isInteractiveTTY } from './env-inspector'
export type {
  SafetyGateOptions,
  AffectedResource,
  RiskLevel,
  Reversibility,
  ConfirmationPolicy,
} from './types'
