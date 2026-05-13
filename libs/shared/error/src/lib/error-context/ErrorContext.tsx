import React, {
  createContext,
  useCallback,
  useContext,
  useReducer,
  useState,
} from 'react'
import type { AppError } from '../types'
import { enrichError } from '../observability/enrichError'
import { useErrorTelemetry } from '../observability/useErrorTelemetry'

// ── Context contract ────────────────────────────────────────────────────────

interface ErrorContextValue {
  // ── Legacy singular API (unchanged — all existing consumers work as-is) ──
  error: AppError | null
  setError: (error: AppError) => void
  clearError: () => void

  // ── Extended queue API (additive) ─────────────────────────────────────────
  errors: AppError[]
  pushError: (error: AppError) => void
  removeError: (errorId: string) => void
  clearAllErrors: () => void
  hasBlockingError: boolean
}

// ── Queue reducer ───────────────────────────────────────────────────────────

interface QueueState {
  errors: AppError[]
}

type QueueAction =
  | { type: 'PUSH'; error: AppError }
  | { type: 'REMOVE'; errorId: string }
  | { type: 'CLEAR_ALL' }

const MAX_QUEUE_SIZE = 5

function isDuplicate(queue: AppError[], incoming: AppError): boolean {
  return queue.some(
    (e) =>
      (e.errorId && e.errorId === incoming.errorId) ||
      (e.kind === incoming.kind && e.message === incoming.message),
  )
}

function queueReducer(state: QueueState, action: QueueAction): QueueState {
  switch (action.type) {
    case 'PUSH': {
      const enriched = enrichError(action.error)
      if (isDuplicate(state.errors, enriched)) return state
      const next = [...state.errors, enriched]
      if (next.length > MAX_QUEUE_SIZE) next.shift()
      return { errors: next }
    }
    case 'REMOVE':
      return { errors: state.errors.filter((e) => e.errorId !== action.errorId) }
    case 'CLEAR_ALL':
      return { errors: [] }
    default:
      return state
  }
}

// ── Telemetry sink (null renderer) ─────────────────────────────────────────

const ErrorTelemetrySink: React.FC<{ errors: AppError[] }> = ({ errors }) => {
  useErrorTelemetry(errors)
  return null
}

// ── Context + Provider ──────────────────────────────────────────────────────

const ErrorContext = createContext<ErrorContextValue>({
  error: null,
  setError: () => undefined,
  clearError: () => undefined,
  errors: [],
  pushError: () => undefined,
  removeError: () => undefined,
  clearAllErrors: () => undefined,
  hasBlockingError: false,
})

export const ErrorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Legacy singular state — behavior unchanged
  const [error, setErrorState] = useState<AppError | null>(null)

  const setError = useCallback((err: AppError) => {
    setErrorState(err)
  }, [])

  const clearError = useCallback(() => {
    setErrorState(null)
  }, [])

  // New queue state
  const [queueState, dispatch] = useReducer(queueReducer, { errors: [] })

  const pushError = useCallback((err: AppError) => {
    dispatch({ type: 'PUSH', error: err })
  }, [])

  const removeError = useCallback((errorId: string) => {
    dispatch({ type: 'REMOVE', errorId })
  }, [])

  const clearAllErrors = useCallback(() => {
    setErrorState(null)
    dispatch({ type: 'CLEAR_ALL' })
  }, [])

  const hasBlockingError = queueState.errors.some(
    (e) => e.severity === 'blocking' || e.lifecycle === 'blocking',
  )

  return (
    <ErrorContext.Provider
      value={{
        error,
        setError,
        clearError,
        errors: queueState.errors,
        pushError,
        removeError,
        clearAllErrors,
        hasBlockingError,
      }}
    >
      <ErrorTelemetrySink errors={queueState.errors} />
      {children}
    </ErrorContext.Provider>
  )
}

export const useError = (): ErrorContextValue => useContext(ErrorContext)
