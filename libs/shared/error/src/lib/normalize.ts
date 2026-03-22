import type { AppError, UnauthorizedError, NetworkError, ApiError, UnknownError } from './types'

function isUnauthorized(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const e = error as Record<string, unknown>

  // Supabase PostgREST JWT auth codes
  if (e['code'] === 'PGRST301' || e['code'] === 'PGRST302') return true

  // PostgreSQL permission denied (RLS, missing grants)
  if (e['code'] === '42501') return true

  // HTTP 401 or 403
  if (e['status'] === 401 || e['status'] === 403) return true

  // PostgreSQL RAISE EXCEPTION (P0001) — only treat as unauthorized when message is auth-related
  if (e['code'] === 'P0001') {
    const p0001msg = typeof e['message'] === 'string' ? e['message'].toLowerCase() : ''
    return (
      p0001msg.includes('authentication required') ||
      p0001msg.includes('not authenticated') ||
      p0001msg.includes('profile not found')
    )
  }

  // Message-based fallback — covers JWT errors and RLS "permission denied for view/table"
  const msg = typeof e['message'] === 'string' ? e['message'].toLowerCase() : ''
  return (
    msg.includes('jwt') ||
    msg.includes('unauthorized') ||
    msg.includes('not authenticated') ||
    msg.includes('permission denied')
  )
}

function isNetworkError(error: unknown): boolean {
  return (
    error instanceof TypeError &&
    (error.message.toLowerCase().includes('fetch') ||
      error.message.toLowerCase().includes('network'))
  )
}

export function normalizeError(error: unknown): AppError {
  if (isUnauthorized(error)) {
    const originalMsg =
      error && typeof error === 'object' ? (error as Record<string, unknown>)['message'] : undefined
    return {
      kind: 'unauthorized',
      message:
        typeof originalMsg === 'string' && originalMsg.trim()
          ? originalMsg
          : 'You are not authorized to view this content.',
      originalError: error,
    } satisfies UnauthorizedError
  }

  // API business errors: { error: "Insufficient credit balance" } or { error: { message: "..." } }
  if (error && typeof error === 'object' && 'error' in (error as object)) {
    const apiError = (error as Record<string, unknown>)['error']

    // Handle nested error object with message property
    if (apiError && typeof apiError === 'object' && 'message' in (apiError as object)) {
      const nestedMsg = (apiError as Record<string, unknown>)['message']
      if (typeof nestedMsg === 'string' && nestedMsg.trim()) {
        return {
          kind: 'api',
          message: nestedMsg.trim(),
          originalError: error,
        } satisfies ApiError
      }
    }

    // Handle simple string error message
    if (typeof apiError === 'string' && apiError.trim()) {
      return {
        kind: 'api',
        message: apiError.trim(),
        originalError: error,
      } satisfies ApiError
    }
  }

  if (isNetworkError(error)) {
    return {
      kind: 'network',
      message: 'A network error occurred. Please check your connection and try again.',
      originalError: error,
    } satisfies NetworkError
  }

  return {
    kind: 'unknown',
    message: 'An unexpected error occurred. Please try again.',
    originalError: error,
  } satisfies UnknownError
}
