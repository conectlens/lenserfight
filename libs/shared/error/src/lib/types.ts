export type ErrorKind = 'unauthorized' | 'network' | 'api' | 'unknown'

export interface AppError {
  kind: ErrorKind
  message: string
  originalError?: unknown
}

export interface UnauthorizedError extends AppError {
  kind: 'unauthorized'
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
