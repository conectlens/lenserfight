import { useState, useEffect, useCallback, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { executionService, walletService, generationService, walletApiClient } from '@lenserfight/data/repositories'
import { queryKeys } from '@lenserfight/data/cache'
import { PromptExecutionRecord, AIModel, PromptParam, WalletExecuteResponse, StreamState, StreamUsage } from '@lenserfight/types'
import { renderPrompt } from '@lenserfight/utils/text'
import { useToast } from '@lenserfight/shared/error'

const PAGE_SIZE = 20

export interface TriggerLabExecutionDTO {
  model: AIModel
  promptContent: string
  inputSnapshot: Record<string, any>
  params?: PromptParam[]
}

export const useLabController = (promptId: string, isAuthenticated = false) => {
  const queryClient = useQueryClient()
  const { toastError } = useToast()

  // Pagination offset for execution history
  const [historyOffset, setHistoryOffset] = useState(0)
  const [allHistory, setAllHistory] = useState<PromptExecutionRecord[]>([])
  const [hasMoreHistory, setHasMoreHistory] = useState(true)

  // Latest sync execution result
  const [latestResult, setLatestResult] = useState<WalletExecuteResponse | null>(null)

  // Streaming state
  const [streamState, setStreamState] = useState<StreamState>('idle')
  const [streamOutput, setStreamOutput] = useState('')
  const [streamRunId, setStreamRunId] = useState<string | null>(null)
  const [streamUsage, setStreamUsage] = useState<StreamUsage | null>(null)
  const [streamCredits, setStreamCredits] = useState<number | null>(null)
  const [streamError, setStreamError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Selection state for artifact viewer + comparison
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)
  const [comparisonRunIds, setComparisonRunIds] = useState<string[]>([])

  // --- Execution history query ---
  const { data: historyPage, isLoading: isLoadingHistory } = useQuery({
    queryKey: queryKeys.executions.history(promptId, historyOffset),
    queryFn: () => executionService.getHistory(promptId, PAGE_SIZE, historyOffset),
    enabled: !!promptId && isAuthenticated,
    staleTime: 30_000,
  })

  useEffect(() => {
    if (!historyPage) return
    if (historyOffset === 0) {
      setAllHistory(historyPage)
    } else {
      setAllHistory((prev) => {
        const existingIds = new Set(prev.map((r) => r.id))
        const newItems = historyPage.filter((r) => !existingIds.has(r.id))
        return [...prev, ...newItems]
      })
    }
    setHasMoreHistory(historyPage.length >= PAGE_SIZE)
  }, [historyPage, historyOffset])

  const loadMoreHistory = useCallback(() => {
    if (!hasMoreHistory || isLoadingHistory) return
    setHistoryOffset((prev) => prev + PAGE_SIZE)
  }, [hasMoreHistory, isLoadingHistory])

  // --- AI Models query ---
  const { data: aiModels = [], isLoading: isLoadingModels } = useQuery<AIModel[]>({
    queryKey: queryKeys.aiModels.all,
    queryFn: () => generationService.getAIModels(),
    staleTime: 5 * 60_000,
  })

  // --- Sync execution mutation via platform /execute/wallet ---
  const {
    mutate: triggerExecution,
    isPending: isTriggeringExecution,
    error: triggerError,
  } = useMutation({
    mutationFn: ({ model, promptContent, inputSnapshot, params }: TriggerLabExecutionDTO) => {
      const resolvedContent = renderPrompt(promptContent, inputSnapshot, params ?? [])
      return walletService.executeWithWallet({
        provider: model.provider,
        model: model.key,
        messages: [{ role: 'user', content: resolvedContent }],
        max_tokens: model.max_tokens,
        temperature: model.temperature,
      })
    },
    onSuccess: (result) => {
      setLatestResult(result)
      // Refresh history — platform backend may write a run record
      queryClient.invalidateQueries({ queryKey: queryKeys.executions.history(promptId) })
      setHistoryOffset(0)
    },
    onError: (err) => toastError(err),
  })

  // --- Streaming execution ---
  const triggerStream = useCallback(
    (dto: TriggerLabExecutionDTO) => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      setStreamState('loading')
      setStreamOutput('')
      setStreamRunId(null)
      setStreamUsage(null)
      setStreamCredits(null)
      setStreamError(null)

      const resolvedContent = renderPrompt(dto.promptContent, dto.inputSnapshot, dto.params ?? [])

      walletApiClient
        .streamWithWallet(
          {
            provider: dto.model.provider,
            model: dto.model.key,
            messages: [{ role: 'user', content: resolvedContent }],
            max_tokens: dto.model.max_tokens,
            temperature: dto.model.temperature,
          },
          controller.signal,
          {
            onStart: (runId) => {
              setStreamRunId(runId)
              setStreamState('streaming')
            },
            onToken: (content) => setStreamOutput((prev) => prev + content),
            onEnd: (usage, credits) => {
              setStreamUsage(usage)
              setStreamCredits(credits)
              setStreamState('complete')
              queryClient.invalidateQueries({ queryKey: queryKeys.executions.history(promptId) })
              setHistoryOffset(0)
            },
            onError: (message) => {
              setStreamError(message)
              setStreamState('error')
              toastError(new Error(message))
            },
          },
        )
        .catch((err: unknown) => {
          if ((err as Error).name === 'AbortError') {
            setStreamState('idle')
          } else {
            setStreamError((err as Error).message)
            setStreamState('error')
            toastError(err)
          }
        })
    },
    [promptId, queryClient, toastError],
  )

  const stopStream = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
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
    aiModels,
    isLoadingModels,
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
    selectedRunId,
    setSelectedRunId,
    comparisonRunIds,
    toggleComparison,
  }
}
