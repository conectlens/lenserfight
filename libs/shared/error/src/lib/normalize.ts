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

function getHint(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined
  const h = (error as Record<string, unknown>)['hint']
  return typeof h === 'string' ? h : undefined
}

function getDetail(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined
  const d = (error as Record<string, unknown>)['details'] ?? (error as Record<string, unknown>)['detail']
  return typeof d === 'string' ? d : undefined
}

function parseRetryAfter(detail: string | undefined): number | undefined {
  if (!detail) return undefined
  try {
    const parsed = JSON.parse(detail)
    const v = parsed?.retry_after
    return typeof v === 'number' && v > 0 ? Math.ceil(v) : undefined
  } catch {
    return undefined
  }
}

function formatRetryMessage(retryAfter: number): string {
  if (retryAfter >= 60) {
    const mins = Math.ceil(retryAfter / 60)
    return `Try again in ${mins} minute${mins !== 1 ? 's' : ''}.`
  }
  return `Try again in ${retryAfter} second${retryAfter !== 1 ? 's' : ''}.`
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

export function normalizeError(error: unknown): UnauthorizedError | ForbiddenError | NotFoundError | RateLimitError | ServerError | NetworkError | ConstraintViolationError | ApiError | UnknownError {
  const status = getStatus(error)
  const code = getCode(error)
  const hint = getHint(error)
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
  // Covers HTTP 429 and Postgres RAISE EXCEPTION with hint 'p0429'.
  // DETAIL may carry JSON {"retry_after": <seconds>} for countdown messaging.
  if (
    status === 429 ||
    (code === 'P0001' && hint === 'p0429')
  ) {
    const detail = getDetail(error)
    const retryAfter = parseRetryAfter(detail)

    const baseMessages: Record<string, string> = {
      battle_rate_limit_exceeded: 'You\'ve reached the battle creation limit.',
    }
    const base = baseMessages[msg] ?? 'Too many requests.'
    const suffix = retryAfter != null ? ` ${formatRetryMessage(retryAfter)}` : ' Please wait a moment before trying again.'

    return {
      kind: 'rate_limit',
      statusCode: status ?? 429,
      message: base + suffix,
      retryAfter,
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

  // ── token_quota_exceeded ────────────────────────────────────────────────────
  if (
    (code === 'P0001' && hint?.toLowerCase().includes('quota')) ||
    status === 402 ||
    msg.includes('quota exceeded') ||
    msg.includes('insufficient credits') ||
    msg.includes('token quota')
  ) {
    return {
      kind: 'token_quota_exceeded',
      statusCode: status ?? 402,
      message: "You've exceeded your token quota. Please top up your credits.",
      retryable: false,
      originalError: error,
    }
  }

  // ── model_unavailable ───────────────────────────────────────────────────────
  if (
    msg.includes('model not available') ||
    msg.includes('model overloaded') ||
    msg.includes('provider unavailable') ||
    (status === 503 && (msg.includes('model') || msg.includes('provider')))
  ) {
    return {
      kind: 'model_unavailable',
      statusCode: status ?? 503,
      message: 'The selected AI model is currently unavailable. Please try again shortly.',
      retryable: true,
      originalError: error,
    }
  }

  // ── PostgreSQL RAISE EXCEPTION (P0001) not matched above — surface the message
  if (code === 'P0001') {
    const rawMsg = error && typeof error === 'object'
      ? ((error as Record<string, unknown>)['message'] as string | undefined)?.trim() ?? ''
      : ''
    if (rawMsg) {
      return {
        kind: 'api',
        statusCode: status ?? 400,
        message: rawMsg.charAt(0).toUpperCase() + rawMsg.slice(1),
        originalError: error,
      } satisfies ApiError
    }
  }

  // ── Plain JS Error instance — surface its message directly ──────────────────
  if (error instanceof Error && error.message.trim()) {
    return {
      kind: 'unknown',
      statusCode: undefined,
      message: error.message.trim(),
      originalError: error,
    } satisfies UnknownError
  }

  return {
    kind: 'unknown',
    statusCode: status,
    message: 'An unexpected error occurred. Please try again.',
    originalError: error,
  } satisfies UnknownError
}
