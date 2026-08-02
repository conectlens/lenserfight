export { assertSafe } from './guard'
export { isCI, isProduction, isLocalMode, detectEnvLabel, isInteractiveTTY } from '@lenserfight/cli-client'
export type {
  SafetyGateOptions,
  AffectedResource,
  RiskLevel,
  Reversibility,
  ConfirmationPolicy,
} from './types'
