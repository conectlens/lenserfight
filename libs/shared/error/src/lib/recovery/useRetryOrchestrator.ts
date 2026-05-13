import { useCallback, useRef, useState } from 'react'

export interface RetryOrchestratorOptions {
  maxAttempts?: number
  baseDelayMs?: number
  maxDelayMs?: number
  onRetry?: (attempt: number) => void
  onExhausted?: () => void
}

export interface RetryOrchestratorResult {
  attempt: number
  isRetrying: boolean
  canRetry: boolean
  nextRetryMs: number | null
  retry: () => void
  reset: () => void
}

function computeDelay(attempt: number, baseMs: number, maxMs: number): number {
  const jitter = Math.random() * 300
  return Math.min(baseMs * Math.pow(2, attempt) + jitter, maxMs)
}

export function useRetryOrchestrator(
  fn: () => Promise<void>,
  options: RetryOrchestratorOptions = {},
): RetryOrchestratorResult {
  const {
    maxAttempts = 3,
    baseDelayMs = 1000,
    maxDelayMs = 30000,
    onRetry,
    onExhausted,
  } = options

  const [attempt, setAttempt] = useState(0)
  const [isRetrying, setIsRetrying] = useState(false)
  const [nextRetryMs, setNextRetryMs] = useState<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activeRef = useRef(true)

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setAttempt(0)
    setIsRetrying(false)
    setNextRetryMs(null)
  }, [])

  const retry = useCallback(() => {
    if (attempt >= maxAttempts) {
      onExhausted?.()
      return
    }

    const delay = attempt === 0 ? 0 : computeDelay(attempt - 1, baseDelayMs, maxDelayMs)
    setNextRetryMs(delay > 0 ? delay : null)
    setIsRetrying(true)

    timerRef.current = setTimeout(async () => {
      if (!activeRef.current) return
      const currentAttempt = attempt + 1
      setAttempt(currentAttempt)
      setNextRetryMs(null)
      onRetry?.(currentAttempt)
      try {
        await fn()
        if (activeRef.current) setIsRetrying(false)
      } catch {
        if (!activeRef.current) return
        setIsRetrying(false)
        if (currentAttempt >= maxAttempts) {
          onExhausted?.()
        }
      }
    }, delay)
  }, [attempt, maxAttempts, baseDelayMs, maxDelayMs, fn, onRetry, onExhausted])

  return {
    attempt,
    isRetrying,
    canRetry: attempt < maxAttempts,
    nextRetryMs,
    retry,
    reset,
  }
}
