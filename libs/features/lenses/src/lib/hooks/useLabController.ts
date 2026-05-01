import { useState, useEffect, useCallback, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { executionService, walletService, walletApiClient } from '@lenserfight/data/repositories'
import { queryKeys } from '@lenserfight/data/cache'
import { LensExecutionHistoryItem, LensParam, ExecuteResponse, StreamState, StreamUsage, FundingSource, GenerativeMediaParams, TriggerExecutionResponse } from '@lenserfight/types'
import { renderLens } from '@lenserfight/utils/text'
import { useToast } from '@lenserfight/shared/error'
import { useAIProviders, useAIModelsByProvider } from '@lenserfight/features/generations'
import { useAuth } from '@lenserfight/features/auth'
import { streamLocalProvider } from '../utils/localProviderStream'

const PAGE_SIZE = 20

export interface TriggerLabExecutionDTO {
  providerKey: 'openai' | 'anthropic' | 'google' | 'mistral' | 'ollama'
  modelKey: string
  lensContent: string
  inputSnapshot: Record<string, any>
  params?: LensParam[]
  fundingSource?: FundingSource
  byokKeyRefId?: string
  /** ID of a locally stored encrypted key; resolved by resolveLocalKey at stream time */
  byokLocalKeyId?: string
  /** When set to a non-text modality, routes through the async API path instead of streaming. */
  output_modality?: 'image' | 'video' | 'audio' | 'music'
  /** Provider-specific params for generative media (dimensions, duration, etc.). */
  generative_media_params?: GenerativeMediaParams
}

export interface LabControllerOptions {
  preferredProviderKey?: string | null
  preferredModelKey?: string | null
  /** Decrypts a locally stored key by ID — injected from useFundingSource */
  resolveLocalKey?: (id: string) => Promise<string>
  /** Gate provider list fetching (lazy load) */
  providersEnabled?: boolean
}

export const useLabController = (lensId: string, isAuthenticated = false, options: LabControllerOptions = {}) => {
  const queryClient = useQueryClient()
  const { toastError } = useToast()
  const { redirectToLogin } = useAuth()

  // Pagination offset for execution history
  const [historyOffset, setHistoryOffset] = useState(0)
  const [allHistory, setAllHistory] = useState<LensExecutionHistoryItem[]>([])
  const [hasMoreHistory, setHasMoreHistory] = useState(true)

  // Latest sync execution result
  const [latestResult, setLatestResult] = useState<ExecuteResponse | null>(null)

  // Streaming state
  const [streamState, setStreamState] = useState<StreamState>('idle')
  const [streamOutput, setStreamOutput] = useState('')
  const [streamRunId, setStreamRunId] = useState<string | null>(null)
  const [streamUsage, setStreamUsage] = useState<StreamUsage | null>(null)
  const [streamCredits, setStreamCredits] = useState<number | null>(null)
  const [streamError, setStreamError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const streamOutputRef = useRef('')
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Async media run state (image / video / audio / music generation)
  const [asyncMediaRunId, setAsyncMediaRunId] = useState<string | null>(null)

  // Clean up poll interval on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    }
  }, [])

  // Selection state for artifact viewer + comparison
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)
  const [comparisonRunIds, setComparisonRunIds] = useState<string[]>([])

  // --- Execution history query ---
  const { data: historyPage, isLoading: isLoadingHistory } = useQuery({
    queryKey: queryKeys.executions.history(lensId, historyOffset),
    queryFn: () => executionService.getHistory(lensId, PAGE_SIZE, historyOffset),
    enabled: !!lensId && isAuthenticated,
    staleTime: 60_000,
  })

  useEffect(() => {
    if (!historyPage) return
    if (historyOffset === 0) {
      setAllHistory(historyPage)
    } else {
      setAllHistory((prev) => {
        const existingIds = new Set(prev.map((r) => r.requestId))
        const newItems = historyPage.filter((r) => !existingIds.has(r.requestId))
        return [...prev, ...newItems]
      })
    }
    setHasMoreHistory(historyPage.length >= PAGE_SIZE)
  }, [historyPage, historyOffset])

  const loadMoreHistory = useCallback(() => {
    if (!hasMoreHistory || isLoadingHistory) return
    setHistoryOffset((prev) => prev + PAGE_SIZE)
  }, [hasMoreHistory, isLoadingHistory])

  // --- Provider / Model selection ---
  const { preferredProviderKey, preferredModelKey } = options
  const [selectedProviderKey, setSelectedProviderKey] = useState(() => preferredProviderKey ?? '')
  const [selectedModelKey, setSelectedModelKey] = useState(() => preferredModelKey ?? '')

  // Sync preferences into selection once they resolve (e.g. after auth)
  useEffect(() => {
    if (preferredProviderKey && !selectedProviderKey) {
      setSelectedProviderKey(preferredProviderKey)
    }
  }, [preferredProviderKey]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (preferredModelKey && selectedProviderKey && !selectedModelKey) {
      setSelectedModelKey(preferredModelKey)
    }
  }, [preferredModelKey, selectedProviderKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const { data: providers = [], isLoading: isLoadingProviders } = useAIProviders({
    enabled: options.providersEnabled ?? true,
  })
  const { data: providerModels = [], isLoading: isLoadingModels } = useAIModelsByProvider(
    selectedProviderKey || null
  )

  const handleProviderChange = useCallback((key: string) => {
    setSelectedProviderKey(key)
    setSelectedModelKey('')
  }, [])

  // --- Sync execution mutation via platform /execute ---
  const {
    mutate: triggerExecution,
    isPending: isTriggeringExecution,
    error: triggerError,
  } = useMutation({
    mutationFn: ({ providerKey, modelKey, lensContent, inputSnapshot, params }: TriggerLabExecutionDTO) => {
      const resolvedContent = renderLens(lensContent, inputSnapshot, params ?? [])
      return walletService.execute({
        provider: providerKey,
        model: modelKey,
        messages: [{ role: 'user', content: resolvedContent }],
      })
    },
    onSuccess: (result) => {
      setLatestResult(result)
      // Refresh history — platform backend may write a run record
      queryClient.invalidateQueries({ queryKey: queryKeys.executions.history(lensId) })
      setHistoryOffset(0)
    },
    onError: (err) => toastError(err),
  })

  // --- Streaming execution ---
  const triggerStream = useCallback(
    (dto: TriggerLabExecutionDTO) => {
      if (!isAuthenticated) {
        setStreamError('401: Unauthenticated')
        setStreamState('error')
        redirectToLogin(2000)
        return
      }
      // ── Async media path (image / video / audio / music) ────────────────────
      if (dto.output_modality) {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
        setStreamState('loading')
        setStreamError(null)
        setStreamOutput('')
        setStreamRunId(null)
        setAsyncMediaRunId(null)
        const mediaIsActive = { value: true }

        executionService.triggerExecution({
          lens_id: lensId,
          model_id: dto.modelKey,
          input_snapshot: dto.inputSnapshot,
          funding_source: dto.fundingSource ?? 'platform_credit',
          origin_type: 'lens_preview',
          byok_key_ref_id: dto.byokKeyRefId,
          generative_media_params: {
            output_modality: dto.output_modality,
            ...dto.generative_media_params,
          },
        }).then((resp: TriggerExecutionResponse) => {
          if (!mediaIsActive.value) return
          const runId = resp.execution_run_id
          setAsyncMediaRunId(runId)
          setStreamRunId(runId)
          setStreamState('streaming')

          pollIntervalRef.current = setInterval(() => {
            executionService.getRunById(runId).then((run) => {
              if (!mediaIsActive.value || !run) return
              if (run.status === 'succeeded') {
                clearInterval(pollIntervalRef.current!)
                pollIntervalRef.current = null
                setAsyncMediaRunId(null)
                // Reset to idle so LabArtifactViewer switches to the RunArtifacts view
                // (setting 'complete' would keep StreamingOutput on screen with empty text)
                setStreamState('idle')
                setSelectedRunId(runId)
                queryClient.invalidateQueries({ queryKey: queryKeys.executions.history(lensId) })
                setHistoryOffset(0)
              } else if (['failed', 'timed_out', 'cancelled', 'canceled'].includes(run.status)) {
                clearInterval(pollIntervalRef.current!)
                pollIntervalRef.current = null
                setAsyncMediaRunId(null)
                const msg = `Media generation ${run.status}`
                setStreamError(msg)
                setStreamState('error')
                toastError(new Error(msg))
              }
            }).catch(() => { /* transient poll error — keep retrying */ })
          }, 3000)
        }).catch((err: unknown) => {
          if (!mediaIsActive.value) return
          setStreamError((err as Error).message)
          setStreamState('error')
          toastError(err)
        })

        // Return a cleanup that cancels the poll but does not abort a streaming request
        return void (abortRef.current = { abort: () => { mediaIsActive.value = false; if (pollIntervalRef.current) { clearInterval(pollIntervalRef.current); pollIntervalRef.current = null } setAsyncMediaRunId(null) } } as AbortController)
      }

      // ── Streaming text path ──────────────────────────────────────────────────
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      const isActive = () => abortRef.current === controller
      setStreamState('loading')
      setStreamOutput('')
      streamOutputRef.current = ''
      setStreamRunId(null)
      setStreamUsage(null)
      setStreamCredits(null)
      setStreamError(null)

      const resolvedContent = renderLens(dto.lensContent, dto.inputSnapshot, dto.params ?? [])

      if (dto.fundingSource === 'user_byok_cloud' && !dto.byokKeyRefId) {
        const message = 'Cloud BYOK requires a selected API key.'
        setStreamError(message)
        setStreamState('error')
        toastError(new Error(message))
        return
      }

      const callbacks = {
        onStart: (runId: string) => {
          if (!isActive()) return
          setStreamRunId(runId)
          setStreamState('streaming')
        },
        onToken: (content: string) => {
          if (!isActive()) return
          // Collapse runs of 10+ spaces (e.g. Gemini table-padding) to a single space
          const cleaned = content.replace(/ {10,}/g, ' ')
          streamOutputRef.current += cleaned
          setStreamOutput((prev) => prev + cleaned)
        },
        onEnd: (usage: { input_tokens: number; output_tokens: number }, credits: number) => {
          if (!isActive()) return
          setStreamUsage(usage)
          setStreamCredits(credits)
          setStreamState('complete')

          // Persist local BYOK executions to the database so they survive page refresh
          if (dto.fundingSource === 'user_byok_local' && streamOutputRef.current) {
            executionService
              .persistLocalExecution({
                lensId,
                provider: dto.providerKey,
                model: dto.modelKey,
                contentText: streamOutputRef.current,
                tokenInput: usage.input_tokens,
                tokenOutput: usage.output_tokens,
              })
              .then((runId) => {
                if (isActive()) setStreamRunId(runId)
              })
              .catch(() => {
                // Best-effort — stream output is already visible to user
              })
          }

          queryClient.invalidateQueries({ queryKey: queryKeys.executions.history(lensId) })
          setHistoryOffset(0)
        },
        onError: (message: string) => {
          if (!isActive()) return
          setStreamError(message)
          setStreamState('error')
          toastError(new Error(message))
        },
      }

      const streamPromise =
        dto.fundingSource === 'user_byok_local' && dto.byokLocalKeyId && options.resolveLocalKey
          ? options.resolveLocalKey(dto.byokLocalKeyId).then((decryptedKey) =>
              streamLocalProvider({
                provider: dto.providerKey,
                model: dto.modelKey,
                messages: [{ role: 'user', content: resolvedContent }],
                decryptedKey,
                signal: controller.signal,
                callbacks,
              }),
            )
          : dto.fundingSource === 'user_byok_cloud' && dto.byokKeyRefId
            ? walletApiClient.streamWithByok(
                {
                  key_ref_id: dto.byokKeyRefId,
                  provider: dto.providerKey,
                  model: dto.modelKey,
                  messages: [{ role: 'user', content: resolvedContent }],
                },
                controller.signal,
                callbacks,
              )
            : walletApiClient.streamWithWallet(
                {
                  provider: dto.providerKey,
                  model: dto.modelKey,
                  messages: [{ role: 'user', content: resolvedContent }],
                },
                controller.signal,
                callbacks,
              )

      streamPromise.catch((err: unknown) => {
          if (!isActive()) return
          if ((err as Error).name === 'AbortError') {
            setStreamState('idle')
          } else {
            setStreamError((err as Error).message)
            setStreamState('error')
            toastError(err)
          }
        })
    },
    [lensId, queryClient, toastError, isAuthenticated, redirectToLogin],
  )

  const stopStream = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    streamOutputRef.current = ''
    setStreamOutput('')
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
    setAsyncMediaRunId(null)
    setStreamState('idle')
  }, [])

  // --- Comparison toggle: max 2 runs ---
  const toggleComparison = useCallback((runId: string) => {
    setComparisonRunIds((prev) => {
      if (prev.includes(runId)) return prev.filter((id) => id !== runId)
      if (prev.length >= 2) return [prev[1], runId]
      return [...prev, runId]
    })
  }, [])

  return {
    history: allHistory,
    isLoadingHistory,
    hasMoreHistory,
    loadMoreHistory,
    providers,
    isLoadingProviders,
    providerModels,
    isLoadingModels,
    selectedProviderKey,
    selectedModelKey,
    setSelectedModelKey,
    handleProviderChange,
    latestResult,
    triggerExecution,
    isTriggeringExecution,
    triggerError,
    streamState,
    streamOutput,
    streamRunId,
    streamUsage,
    streamCredits,
    streamError,
    triggerStream,
    stopStream,
    asyncMediaRunId,
    selectedRunId,
    setSelectedRunId,
    comparisonRunIds,
    toggleComparison,
  }
}
