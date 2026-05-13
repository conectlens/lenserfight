import type { AppError } from '../types'

function generateFingerprint(error: AppError): string {
  const raw = `${error.kind}|${error.statusCode ?? ''}|${error.message.slice(0, 80)}`
  try {
    return btoa(raw).replace(/[+/=]/g, '').slice(0, 16)
  } catch {
    return `${error.kind}-${Date.now().toString(36)}`
  }
}

function generateCorrelationId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

export function enrichError(error: AppError): AppError {
  if (error.errorId && error.fingerprint && error.correlationId) return error

  const fingerprint = error.fingerprint ?? generateFingerprint(error)
  const errorId = error.errorId ?? `${fingerprint}-${Date.now().toString(36)}`

  return {
    ...error,
    errorId,
    fingerprint,
    correlationId: error.correlationId ?? generateCorrelationId(),
  }
}
