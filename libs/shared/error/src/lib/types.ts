export type ErrorKind =
  | 'unauthorized'  // 401 — session missing / JWT expired
  | 'forbidden'     // 403 / PG 42501 — authenticated but access denied
  | 'not_found'     // 404
  | 'server_error'  // 500 / 502 / 503 / 504
  | 'rate_limit'    // 429
  | 'network'
  | 'api'
  | 'unknown'

export interface AppError {
  kind: ErrorKind
  statusCode?: number
  message: string
  originalError?: unknown
}

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
}

export interface NetworkError extends AppError {
  kind: 'network'
}

export interface ApiError extends AppError {
  kind: 'api'
}

export interface UnknownError extends AppError {
  kind: 'unknown'
}
