import type { AppError } from '../types'

export interface LFTelemetry {
  captureException(error: Error, context?: Record<string, unknown>): void
  captureAppError?(error: AppError): void
  setUser?(id: string, traits?: Record<string, unknown>): void
  addBreadcrumb?(message: string, data?: Record<string, unknown>): void
}

export function getLFTelemetry(): LFTelemetry | null {
  if (typeof window === 'undefined') return null
  const tel = (window as Record<string, unknown>)['__lf_telemetry']
  if (!tel || typeof tel !== 'object') return null
  return tel as LFTelemetry
}
