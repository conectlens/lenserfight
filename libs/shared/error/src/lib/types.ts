export type ErrorKind =
  // ── Existing ───────────────────────────────────────────────────────────────
  | 'unauthorized'         // 401 — session missing / JWT expired
  | 'forbidden'            // 403 / PG 42501 — authenticated but access denied
  | 'not_found'            // 404
  | 'server_error'         // 500 / 502 / 503 / 504
  | 'rate_limit'           // 429
  | 'network'
  | 'api'
  | 'constraint_violation' // PG 23514/23505/23503 — data rule violated (user-correctable)
  | 'unknown'
  // ── AI / Agent domain ──────────────────────────────────────────────────────
  | 'workflow_failed'
  | 'agent_crashed'
  | 'model_unavailable'
  | 'token_quota_exceeded'
  // ── Infrastructure / Realtime ──────────────────────────────────────────────
  | 'websocket_disconnected'
  | 'realtime_unavailable'
  | 'maintenance'
  | 'edge_unavailable'
  // ── Permission / Feature gating ────────────────────────────────────────────
  | 'feature_locked'
  | 'role_insufficient'
  // ── UX / Guidance ──────────────────────────────────────────────────────────
  | 'onboarding_required'
  | 'empty_state'
  | 'missing_config'
  | 'unsupported_feature'
  // ── Battle domain ──────────────────────────────────────────────────────────
  | 'battle_init_failed'

export type ErrorSeverity = 'blocking' | 'persistent' | 'transient' | 'silent'

export interface AppError {
  kind: ErrorKind
  statusCode?: number
  message: string
  originalError?: unknown
  // ── Extended optional fields (additive — no existing consumer affected) ────
  severity?: ErrorSeverity
  lifecycle?: ErrorSeverity
  errorId?: string                    // deduplication key
  fingerprint?: string                // stable hash for telemetry grouping
  correlationId?: string              // request tracing
  retryable?: boolean
  domain?: string                     // 'battle' | 'workflow' | 'agent' | 'auth' | 'infra'
  context?: Record<string, unknown>   // domain-specific metadata
}

// ── Existing error interfaces (unchanged) ──────────────────────────────────

export interface UnauthorizedError extends AppError {
  kind: 'unauthorized'
}

export interface ForbiddenError extends AppError {
  kind: 'forbidden'
}

export interface NotFoundError extends AppError {
  kind: 'not_found'
}

export interface ServerError extends AppError {
  kind: 'server_error'
}

export interface RateLimitError extends AppError {
  kind: 'rate_limit'
  /** Seconds to wait before retrying, when the server provides this information. */
  retryAfter?: number
}

export interface NetworkError extends AppError {
  kind: 'network'
}

export interface ApiError extends AppError {
  kind: 'api'
}

export interface ConstraintViolationError extends AppError {
  kind: 'constraint_violation'
  constraintName?: string
}

export interface UnknownError extends AppError {
  kind: 'unknown'
}

// ── New domain error interfaces ────────────────────────────────────────────

export interface WorkflowFailedError extends AppError {
  kind: 'workflow_failed'
  workflowId?: string
  runId?: string
}

export interface AgentCrashedError extends AppError {
  kind: 'agent_crashed'
  agentId?: string
  agentHandle?: string
}

export interface ModelUnavailableError extends AppError {
  kind: 'model_unavailable'
  provider?: string
  modelId?: string
}

export interface TokenQuotaExceededError extends AppError {
  kind: 'token_quota_exceeded'
  retryAfter?: number
  quotaType?: 'daily' | 'monthly' | 'burst'
}

export interface WebSocketDisconnectedError extends AppError {
  kind: 'websocket_disconnected'
  reconnectAttempt?: number
}

export interface RealtimeUnavailableError extends AppError {
  kind: 'realtime_unavailable'
}

export interface MaintenanceError extends AppError {
  kind: 'maintenance'
  estimatedResolution?: string
}

export interface EdgeUnavailableError extends AppError {
  kind: 'edge_unavailable'
  region?: string
}

export interface FeatureLockedError extends AppError {
  kind: 'feature_locked'
  featureKey?: string
  upgradeUrl?: string
}

export interface RoleInsufficientError extends AppError {
  kind: 'role_insufficient'
  requiredRole?: string
  currentRole?: string
}

export interface OnboardingRequiredError extends AppError {
  kind: 'onboarding_required'
  onboardingStep?: string
}

export interface EmptyStateError extends AppError {
  kind: 'empty_state'
  entityType?: string
  createPath?: string
}

export interface MissingConfigError extends AppError {
  kind: 'missing_config'
  configKey?: string
  configSection?: string
}

export interface UnsupportedFeatureError extends AppError {
  kind: 'unsupported_feature'
  featureName?: string
}

export interface BattleInitFailedError extends AppError {
  kind: 'battle_init_failed'
  battleId?: string
  battleSlug?: string
}
