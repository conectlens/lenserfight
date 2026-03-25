import { useState, useEffect } from 'react'
import { OLLAMA_DEFAULT_BASE_URL } from '@lenserfight/providers'

export interface OllamaModelInfo {
  name: string
  details?: { parameter_size?: string; family?: string; format?: string }
}

export interface UseOllamaModelsResult {
  /** null = check not yet performed */
  isRunning: boolean | null
  isLoading: boolean
  models: OllamaModelInfo[]
  error: string | null
  refetch: () => void
}

/**
 * Detects whether Ollama is running locally and lists installed models.
 *
 * When `enabled` is false (e.g. Ollama is not the active provider), no
 * network requests are made. Pass `enabled: true` only when the user has
 * selected an Ollama local key.
 *
 * Flow:
 *   GET /api/version  (3 s timeout) → confirms Ollama is alive
 *   GET /api/tags                   → returns installed model list
 */
export function useOllamaModels(enabled: boolean): UseOllamaModelsResult {
  const [isRunning, setIsRunning] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [models, setModels] = useState<OllamaModelInfo[]>([])
  const [error, setError] = useState<string | null>(null)
  // Incrementing this triggers a re-fetch (used by refetch())
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!enabled) return

    setIsLoading(true)
    setError(null)

    const controller = new AbortController()
    // Abort the liveness check after 3 s
    const timeout = setTimeout(() => controller.abort(), 3000)

    fetch(`${OLLAMA_DEFAULT_BASE_URL}/api/version`, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        clearTimeout(timeout)
        return fetch(`${OLLAMA_DEFAULT_BASE_URL}/api/tags`, {
          signal: AbortSignal.timeout(5000),
        })
      })
      .then((r) => r.json())
      .then((data: { models?: OllamaModelInfo[] }) => {
        setIsRunning(true)
        setModels(data.models ?? [])
        setIsLoading(false)
      })
      .catch((err: Error) => {
        clearTimeout(timeout)
        setModels([])
        if (err.name === 'AbortError' || err.name === 'TimeoutError') {
          setIsRunning(false)
          setError('Ollama did not respond within 3 seconds. Is it running?')
        } else {
          setIsRunning(false)
          setError(
            `Cannot reach Ollama at ${OLLAMA_DEFAULT_BASE_URL}. Start it with: ollama serve`,
          )
        }
        setIsLoading(false)
      })

    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
  }, [enabled, tick])

  const refetch = () => setTick((t) => t + 1)

  return { isRunning, isLoading, models, error, refetch }
}
