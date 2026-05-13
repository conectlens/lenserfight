// ── Existing exports (unchanged) ──────────────────────────────────────────────
export type {
  AppError,
  ErrorKind,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ServerError,
  RateLimitError,
  NetworkError,
  ApiError,
  ConstraintViolationError,
  UnknownError,
} from './lib/types'
export { CONSTRAINT_MESSAGES, DEFAULT_CONSTRAINT_MESSAGE } from './lib/constraint-messages'
export { normalizeError } from './lib/normalize'
export { ErrorProvider, useError } from './lib/error-context/ErrorContext'
export { GlobalErrorRenderer } from './lib/error-boundary/GlobalErrorRenderer'
export { ErrorClearer } from './lib/error-boundary/ErrorClearer'
export { UnauthorizedPage } from './lib/error-boundary/UnauthorizedPage'
export { ForbiddenPage } from './lib/error-boundary/ForbiddenPage'
export { NotFoundPage } from './lib/error-boundary/NotFoundPage'
export { ServerErrorPage } from './lib/error-boundary/ServerErrorPage'
export { useToast } from './lib/toast'
export type { ToastErrorOptions } from './lib/toast'
export { handleRateLimitError } from './lib/handleRateLimitError'

// ── New type exports (additive) ───────────────────────────────────────────────
export type {
  ErrorSeverity,
  WorkflowFailedError,
  AgentCrashedError,
  ModelUnavailableError,
  TokenQuotaExceededError,
  WebSocketDisconnectedError,
  RealtimeUnavailableError,
  MaintenanceError,
  EdgeUnavailableError,
  FeatureLockedError,
  RoleInsufficientError,
  OnboardingRequiredError,
  EmptyStateError,
  MissingConfigError,
  UnsupportedFeatureError,
  BattleInitFailedError,
} from './lib/types'

// ── Error registry ─────────────────────────────────────────────────────────────
export type {
  ErrorRenderer,
  ErrorRendererProps,
  ErrorRegistryEntry,
  ErrorRegistry,
} from './lib/error-registry/types'
export {
  registerErrorRenderer,
  getErrorEntry,
  getRegistry,
  __resetErrorRegistryForTests,
} from './lib/error-registry/registry'

// ── Dashboard zone hook ────────────────────────────────────────────────────────
export { useDashboardErrorZones } from './lib/error-context/useDashboardErrorZones'
export type { DashboardErrorZones } from './lib/error-context/useDashboardErrorZones'

// ── Observability ──────────────────────────────────────────────────────────────
export { enrichError } from './lib/observability/enrichError'
export { getLFTelemetry } from './lib/observability/telemetry'
export type { LFTelemetry } from './lib/observability/telemetry'

// ── Recovery hooks ─────────────────────────────────────────────────────────────
export { useRetryOrchestrator } from './lib/recovery/useRetryOrchestrator'
export type {
  RetryOrchestratorOptions,
  RetryOrchestratorResult,
} from './lib/recovery/useRetryOrchestrator'
export { useOfflineDetection } from './lib/recovery/useOfflineDetection'
export type {
  OfflineDetectionOptions,
  OfflineDetectionResult,
} from './lib/recovery/useOfflineDetection'
export { useWebSocketReconnect } from './lib/recovery/useWebSocketReconnect'
export type {
  WebSocketStatus,
  WebSocketReconnectOptions,
  WebSocketReconnectResult,
} from './lib/recovery/useWebSocketReconnect'

// ── Error UI components ────────────────────────────────────────────────────────
export { SmartRetryState } from './lib/components/SmartRetryState'
export { PermissionLockState } from './lib/components/PermissionLockState'
export { AIFailureState } from './lib/components/AIFailureState'
