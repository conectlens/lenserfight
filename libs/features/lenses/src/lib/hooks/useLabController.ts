import { queryKeys } from '@lenserfight/data/cache'
import { executionService } from '@lenserfight/data/repositories'
import { useAuth } from '@lenserfight/features/auth'
import { useAIProviders, useAIModelsByProvider } from '@lenserfight/features/generations'
import { useToast } from '@lenserfight/shared/error'
import { LensExecutionHistoryItem, LensParam, StreamState, StreamUsage, FundingSource, GenerativeMediaParams } from '@lenserfight/types'
import { buildFileAttachmentBindings } from '../utils/resolveLensFileParamsForExecution'
import { buildLabStreamMessages } from '../utils/buildLabStreamMessages'
import type { LensVersionParam } from '@lenserfight/types'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect, useCallback, useRef } from 'react'

import { ProviderError } from '@lenserfight/providers'
import type { StreamingErrorEnvelope } from '@lenserfight/ui/components'

import { FundingAdapterError, selectFundingAdapter, type MediaModality } from '../adapters'

/**
 * Lift any error (`ProviderError`, `FundingAdapterError`, plain `Error`, or
 * string) into the structured envelope that `StreamingOutput` renders. This is
 * the single seam between the execution layer and the UI; downstream
 * components no longer regex-match free-form error strings.
 */
function toStreamingEnvelope(err: unknown): StreamingErrorEnvelope {
  if (err instanceof ProviderError) {
    // `StreamingOutput` renders `traceId` in its own small line; pass the raw
    // provider message here so the body stays clean (no duplicated ref id).
    return { code: err.code, message: err.message, traceId: err.traceId }
  }
  if (err instanceof FundingAdapterError) {
    const code =
      err.kind === 'misconfigured'
        ? 'invalid_request'
        : err.kind === 'unsupported'
          ? 'unsupported_model'
          : 'server_error'
    return { code, message: err.message }
  }
  if (err instanceof Error) {
    return { message: err.message }
  }
  return { message: typeof err === 'string' ? err : 'An unexpected error occurred.' }
}

const PAGE_SIZE = 20

export interface TriggerLabExecutionDTO {
  providerKey: 'openai' | 'anthropic' | 'google' | 'mistral' | 'ollama'
  modelKey: string
  lensContent: string
  inputSnapshot: Record<string, any>
  /** Hydrated version params — preferred for prompt substitution. */
  versionParams?: LensVersionParam[]
  params?: LensParam[]
  fundingSource?: FundingSource
  byokKeyRefId?: string
  /** ID of a locally stored encrypted key; resolved by resolveLocalKey at stream time */
  byokLocalKeyId?: string
  /** When set to a non-text modality, routes through the async API path instead of streaming. */
  output_modality?: 'image' | 'video' | 'audio' | 'music'
  /** Provider-specific params for generative media (dimensions, duration, etc.). */
  generative_media_params?: GenerativeMediaParams
  /** Pin execution to a specific lens version (URL-routed preview). */
  versionId?: string
}

export interface LabControllerOptions {
  preferredProviderKey?: string | null
  preferredModelKey?: string | null
  /** Decrypts a locally stored key by ID — injected from useFundingSource */
  resolveLocalKey?: (id: string) => Promise<string>
  /** Gate provider list fetching (lazy load) */
  providersEnabled?: boolean
  /** Gate history fetching — must have a resolved Lenser profile for fn_get_lens_execution_history to return rows */
  hasActiveLenserProfile?: boolean
  /** Defer history fetching until true (e.g. only when the drawer is open) */
  historyEnabled?: boolean
}

export const useLabController = (lensId: string, isAuthenticated = false, options: LabControllerOptions = {}) => {
  const queryClient = useQueryClient()
  const { toastError } = useToast()
  const { redirectToLogin } = useAuth()

  // Pagination offset for execution history
  const [historyOffset, setHistoryOffset] = useState(0)
  const [allHistory, setAllHistory] = useState<LensExecutionHistoryItem[]>([])
  const [hasMoreHistory, setHasMoreHistory] = useState(true)

  // Streaming state
  const [streamState, setStreamState] = useState<StreamState>('idle')
  const [streamOutput, setStreamOutput] = useState('')
  const [streamRunId, setStreamRunId] = useState<string | null>(null)
  const [streamUsage, setStreamUsage] = useState<StreamUsage | null>(null)
  const [streamCredits, setStreamCredits] = useState<number | null>(null)
  const [streamError, setStreamError] = useState<StreamingErrorEnvelope | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const streamOutputRef = useRef('')
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Async media run state (image / video / audio / music generation)
  const [asyncMediaRunId, setAsyncMediaRunId] = useState<string | null>(null)

  // Transient client-side media artifact (Local BYOK only — no server run record).
  // The browser called the provider directly and got URL(s) back. We keep them
  // in memory so the artifact viewer can render them inline without polling.
  const [localMediaArtifact, setLocalMediaArtifact] = useState<{
    runId: string
    provider: string
    model: string
    modality: MediaModality
    urls: string[]
    mimeType: string
    width?: number
    height?: number
    durationSeconds?: number
  } | null>(null)

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
  // fn_get_lens_execution_history is a SECURITY DEFINER that calls lensers.get_auth_lenser_id().
  // It returns empty rows if no Lenser profile is resolved, so we gate on hasActiveLenserProfile.
  const { data: historyPage, isLoading: isLoadingHistory } = useQuery({
    queryKey: queryKeys.executions.history(lensId, historyOffset),
    queryFn: () => executionService.getHistory(lensId, PAGE_SIZE, historyOffset),
    enabled: !!lensId && isAuthenticated && !!(options.hasActiveLenserProfile ?? false) && !!(options.historyEnabled ?? false),
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

  // --- Streaming execution (adapter-driven) ---
  //
  // Each funding source has a FundingAdapter that exposes `streamText` and
  // `executeMedia`. The dispatcher below is transport-agnostic: it asks the
  // adapter to do the right thing and renders the result. See `../adapters/`.
  const triggerStream = useCallback(
    (dto: TriggerLabExecutionDTO) => {
      if (!isAuthenticated) {
        setStreamError({ code: 'auth_failed', message: 'Please sign in again to continue.' })
        setStreamState('error')
        redirectToLogin(2000)
        return
      }

      const fundingSource: FundingSource = dto.fundingSource ?? 'platform_credit'

      let adapter
      try {
        adapter = selectFundingAdapter(fundingSource, {
          local: options.resolveLocalKey
            ? { resolveLocalKey: options.resolveLocalKey, localKeyId: dto.byokLocalKeyId ?? null }
            : undefined,
          cloud: { keyRefId: dto.byokKeyRefId ?? null },
          chainabit: {},
        })
      } catch (err) {
        setStreamError(toStreamingEnvelope(err))
        setStreamState('error')
        toastError(err)
        return
      }

      // ── Media path (image / video / audio / music) ──────────────────────────
      if (dto.output_modality) {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
        abortRef.current?.abort()
        const mediaController = new AbortController()
        abortRef.current = mediaController
        setStreamState('loading')
        setStreamError(null)
        setStreamOutput('')
        setStreamRunId(null)
        setAsyncMediaRunId(null)
        setLocalMediaArtifact(null)

        const mediaIsActive = { value: true }
        const attachmentBindings =
          dto.versionParams && dto.versionParams.length > 0
            ? buildFileAttachmentBindings(dto.inputSnapshot, dto.versionParams)
            : []

        buildLabStreamMessages({
          lensContent: dto.lensContent,
          inputSnapshot: dto.inputSnapshot,
          versionParams: dto.versionParams,
          params: dto.params,
        })
          .then((messages) => {
            const first = messages[0]
            const prompt =
              first && typeof first.content === 'string'
                ? first.content
                : (first?.content?.find((p) => p.type === 'text') as { text: string } | undefined)
                    ?.text ?? ''

            return adapter.executeMedia(
              {
                lensId,
                versionId: dto.versionId,
                provider: dto.providerKey,
                model: dto.modelKey,
                modality: dto.output_modality,
                prompt,
                inputSnapshot: { ...dto.inputSnapshot, prompt },
                attachmentBindings,
                generativeMediaParams: dto.generative_media_params,
                byokKeyRefId: dto.byokKeyRefId,
              },
              mediaController.signal,
            )
          })
          .then((result) => {
            if (!mediaIsActive.value) return

            if (!result.isAsync) {
              setLocalMediaArtifact({
                runId: result.runId,
                provider: dto.providerKey,
                model: dto.modelKey,
                modality: dto.output_modality as MediaModality,
                urls: result.mediaUrls ?? [],
                mimeType: result.mimeType ?? 'application/octet-stream',
                width: result.width,
                height: result.height,
                durationSeconds: result.durationSeconds,
              })
              setStreamRunId(result.runId)
              setStreamState('idle')
              return
            }

            setAsyncMediaRunId(result.runId)
            setStreamRunId(result.runId)
            setStreamState('streaming')

            pollIntervalRef.current = setInterval(() => {
              executionService
                .getRunById(result.runId)
                .then((run) => {
                  if (!mediaIsActive.value || !run) return
                  if (run.status === 'succeeded') {
                    clearInterval(pollIntervalRef.current!)
                    pollIntervalRef.current = null
                    setAsyncMediaRunId(null)
                    setStreamState('idle')
                    setSelectedRunId(result.runId)
                    queryClient.invalidateQueries({ queryKey: queryKeys.executions.history(lensId) })
                    setHistoryOffset(0)
                  } else if (['failed', 'timed_out', 'cancelled', 'canceled'].includes(run.status)) {
                    clearInterval(pollIntervalRef.current!)
                    pollIntervalRef.current = null
                    setAsyncMediaRunId(null)
                    const msg = `Media generation ${run.status}`
                    setStreamError({ code: 'server_error', message: msg })
                    setStreamState('error')
                    toastError(new Error(msg))
                  }
                })
                .catch(() => {
                  /* transient poll error — keep retrying */
                })
            }, 3000)
          })
          .catch((err: unknown) => {
            if (!mediaIsActive.value) return
            if ((err as Error).name === 'AbortError') {
              setStreamState('idle')
              return
            }
            setStreamError(toStreamingEnvelope(err))
            setStreamState('error')
            toastError(err)
          })

        abortRef.current = {
          abort: () => {
            mediaIsActive.value = false
            mediaController.abort()
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current)
              pollIntervalRef.current = null
            }
            setAsyncMediaRunId(null)
          },
        } as AbortController
        return
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
      setLocalMediaArtifact(null)

      // Captured synchronously from the `start` event so onEnd can persist with
      // the same run_id the server used — this is the dedup key shared with the
      // edge function's server-side write.
      let capturedRunId: string | null = null

      const callbacks = {
        onStart: (runId: string) => {
          if (!isActive()) return
          capturedRunId = runId
          setStreamRunId(runId)
          setStreamState('streaming')
        },
        onToken: (content: string) => {
          if (!isActive()) return
          const cleaned = content.replace(/ {10,}/g, ' ')
          streamOutputRef.current += cleaned
          setStreamOutput((prev) => prev + cleaned)
        },
        onEnd: (usage: { input_tokens: number; output_tokens: number }, credits: number) => {
          if (!isActive()) return
          setStreamUsage(usage)
          setStreamCredits(credits)
          setStreamState('complete')

          // Persist the completed text run so it appears in execution history and
          // survives a page refresh. Keyed on the stream's run_id, so for
          // platform_credit this dedups against the edge function's authoritative
          // server-side write; for cloud/local BYOK (browser-direct streams) this
          // is the only writer. Best-effort — the output is already on screen.
          if (capturedRunId && streamOutputRef.current) {
            executionService
              .persistStreamedExecution({
                runId: capturedRunId,
                lensId,
                versionId: dto.versionId,
                provider: dto.providerKey,
                model: dto.modelKey,
                contentText: streamOutputRef.current,
                tokenInput: usage.input_tokens,
                tokenOutput: usage.output_tokens,
                creditCost: credits,
                fundingSource,
              })
              .then((runId) => {
                if (isActive()) setStreamRunId(runId)
                queryClient.invalidateQueries({ queryKey: queryKeys.executions.history(lensId) })
                setHistoryOffset(0)
              })
              .catch(() => {
                // Best-effort — stream output is already visible to the user
              })
          }

          queryClient.invalidateQueries({ queryKey: queryKeys.executions.history(lensId) })
          setHistoryOffset(0)
        },
        onError: (message: string) => {
          if (!isActive()) return
          setStreamError({ message })
          setStreamState('error')
          toastError(new Error(message))
        },
      }

      buildLabStreamMessages({
        lensContent: dto.lensContent,
        inputSnapshot: dto.inputSnapshot,
        versionParams: dto.versionParams,
        params: dto.params,
      })
        .then((messages) =>
          adapter.streamText(
            {
              lensId,
              versionId: dto.versionId,
              provider: dto.providerKey,
              model: dto.modelKey,
              messages,
            },
            controller.signal,
            callbacks,
          ),
        )
        .catch((err: unknown) => {
          if (!isActive()) return
          if ((err as Error).name === 'AbortError') {
            setStreamState('idle')
          } else {
            setStreamError(toStreamingEnvelope(err))
            setStreamState('error')
            toastError(err)
          }
        })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setLocalMediaArtifact(null)
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
    latestResult: null,
    isTriggeringExecution: false,
    streamState,
    streamOutput,
    streamRunId,
    streamUsage,
    streamCredits,
    streamError,
    triggerStream,
    stopStream,
    asyncMediaRunId,
    localMediaArtifact,
    selectedRunId,
    setSelectedRunId,
    comparisonRunIds,
    toggleComparison,
  }
}
