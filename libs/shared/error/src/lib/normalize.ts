import type { AppError, UnauthorizedError, NetworkError, UnknownError } from './types'

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
