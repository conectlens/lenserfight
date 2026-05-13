import { useEffect, useRef } from 'react'
import type { AppError } from '../types'
import { getLFTelemetry } from './telemetry'

export function useErrorTelemetry(errors: AppError[]): void {
  const reportedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const tel = getLFTelemetry()
    if (!tel) return

    for (const error of errors) {
      const id = error.errorId ?? `${error.kind}::${error.message}`
      if (reportedRef.current.has(id)) continue
      reportedRef.current.add(id)

      if (tel.captureAppError) {
        tel.captureAppError(error)
      } else if (error.originalError instanceof Error) {
        tel.captureException(error.originalError, {
          kind: error.kind,
          fingerprint: error.fingerprint,
          correlationId: error.correlationId,
          statusCode: error.statusCode,
          domain: error.domain,
        })
      }
    }
  }, [errors])
}
