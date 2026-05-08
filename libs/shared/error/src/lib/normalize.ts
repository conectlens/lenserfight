import type {
  AppError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ServerError,
  RateLimitError,
  NetworkError,
  ApiError,
  ConstraintViolationError,
  UnknownError,
} from './types'
import { CONSTRAINT_MESSAGES, DEFAULT_CONSTRAINT_MESSAGE } from './constraint-messages'

function getStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined
  const s = (error as Record<string, unknown>)['status']
  return typeof s === 'number' ? s : undefined
}

function getCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined
  const c = (error as Record<string, unknown>)['code']
  return typeof c === 'string' ? c : undefined
}

function getMessage(error: unknown): string {
  if (!error || typeof error !== 'object') return ''
  const m = (error as Record<string, unknown>)['message']
  return typeof m === 'string' ? m.toLowerCase() : ''
}

function isNetworkError(error: unknown): boolean {
  return (
    error instanceof TypeError &&
    (error.message.toLowerCase().includes('fetch') ||
      error.message.toLowerCase().includes('network'))
  )
}

// Extracts the constraint name from a Postgres violation message.
// Postgres always quotes the constraint name last: ...constraint "my_constraint_name"
function extractConstraintName(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined
  const raw = (error as Record<string, unknown>)['message']
  if (typeof raw !== 'string') return undefined
  const match = /"([^"]+)"[^"]*$/.exec(raw)
  return match?.[1]
}

const CONSTRAINT_VIOLATION_CODES = new Set(['23514', '23505', '23503'])

export function normalizeError(error: unknown): AppError {
  const status = getStatus(error)
  const code = getCode(error)
  const msg = getMessage(error)

  // ── 401 Unauthorized — session missing / JWT expired ───────────────────────
  if (
    status === 401 ||
    code === 'PGRST301' ||
    code === 'PGRST302' ||
    msg.includes('jwt') ||
    msg.includes('not authenticated') ||
    (code === 'P0001' && (msg.includes('not authenticated') || msg.includes('authentication required')))
  ) {
    return {
      kind: 'unauthorized',
      statusCode: status ?? 401,
      message: 'Your session has expired. Please sign in again.',
      originalError: error,
    } satisfies UnauthorizedError
  }

  // ── 403 Forbidden / PG 42501 permission denied ─────────────────────────────
  if (
    status === 403 ||
    code === '42501' ||
    msg.includes('permission denied') ||
    msg.includes('unauthorized') ||
    (code === 'P0001' && msg.includes('profile not found'))
  ) {
    const originalMsg =
      error && typeof error === 'object'
        ? (error as Record<string, unknown>)['message']
        : undefined
    return {
      kind: 'forbidden',
      statusCode: status ?? 403,
      message:
        typeof originalMsg === 'string' && originalMsg.trim()
          ? originalMsg.trim()
          : 'You do not have permission to perform this action.',
      originalError: error,
    } satisfies ForbiddenError
  }

  // ── 404 Not Found ──────────────────────────────────────────────────────────
  if (status === 404) {
    return {
      kind: 'not_found',
      statusCode: 404,
      message: 'The requested resource was not found.',
      originalError: error,
    } satisfies NotFoundError
  }

  // ── 429 Rate Limit ─────────────────────────────────────────────────────────
  if (status === 429) {
    return {
      kind: 'rate_limit',
      statusCode: 429,
      message: 'Too many requests. Please wait a moment before trying again.',
      originalError: error,
    } satisfies RateLimitError
  }

  // ── 5xx Server Error ───────────────────────────────────────────────────────
  if (status !== undefined && status >= 500) {
    return {
      kind: 'server_error',
      statusCode: status,
      message: 'Something went wrong on our end. Please try again in a moment.',
      originalError: error,
    } satisfies ServerError
  }

  // ── Network / fetch error ──────────────────────────────────────────────────
  if (isNetworkError(error)) {
    return {
      kind: 'network',
      message: 'A network error occurred. Please check your connection and try again.',
      originalError: error,
    } satisfies NetworkError
  }

  // ── PG constraint violations: 23514 (check), 23505 (unique), 23503 (FK) ──────
  if (code && CONSTRAINT_VIOLATION_CODES.has(code)) {
    const constraintName = extractConstraintName(error)
    const userMessage =
      (constraintName && CONSTRAINT_MESSAGES[constraintName]) ||
      (constraintName?.endsWith('_format')
        ? 'Invalid format — only lowercase letters, numbers, and hyphens allowed.'
        : DEFAULT_CONSTRAINT_MESSAGE)
    return {
      kind: 'constraint_violation',
      statusCode: status ?? 400,
      message: userMessage,
      constraintName,
      originalError: error,
    } satisfies ConstraintViolationError
  }

  // ── API business errors: { error: "..." } or { error: { message: "..." } } ─
  if (error && typeof error === 'object' && 'error' in (error as object)) {
    const apiError = (error as Record<string, unknown>)['error']

    if (apiError && typeof apiError === 'object' && 'message' in (apiError as object)) {
      const nestedMsg = (apiError as Record<string, unknown>)['message']
      if (typeof nestedMsg === 'string' && nestedMsg.trim()) {
        return {
          kind: 'api',
          statusCode: status,
          message: nestedMsg.trim(),
          originalError: error,
        } satisfies ApiError
      }
    }

    if (typeof apiError === 'string' && apiError.trim()) {
      return {
        kind: 'api',
        statusCode: status,
        message: apiError.trim(),
        originalError: error,
      } satisfies ApiError
    }
  }

  return {
    kind: 'unknown',
    statusCode: status,
    message: 'An unexpected error occurred. Please try again.',
    originalError: error,
  } satisfies UnknownError
}
