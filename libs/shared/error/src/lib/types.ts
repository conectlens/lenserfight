export type ErrorKind = 'unauthorized' | 'network' | 'unknown'

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

export interface UnknownError extends AppError {
  kind: 'unknown'
}
