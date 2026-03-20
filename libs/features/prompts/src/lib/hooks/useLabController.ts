import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { executionService, generationService } from '@lenserfight/data/repositories'
import { queryKeys } from '@lenserfight/data/cache'
import {
  PromptExecutionRecord,
  TriggerExecutionDTO,
  ExecutionRun,
  AIModel,
} from '@lenserfight/types'

const TERMINAL_STATUSES = ['succeeded', 'failed', 'canceled', 'timed_out'] as const
type TerminalStatus = (typeof TERMINAL_STATUSES)[number]

const isTerminal = (status: string): status is TerminalStatus =>
  TERMINAL_STATUSES.includes(status as TerminalStatus)

const PAGE_SIZE = 20

export const useLabController = (promptId: string) => {
  const queryClient = useQueryClient()

  // Pagination offset for execution history
  const [historyOffset, setHistoryOffset] = useState(0)
  const [allHistory, setAllHistory] = useState<PromptExecutionRecord[]>([])
  const [hasMoreHistory, setHasMoreHistory] = useState(true)

  // In-flight execution run id for polling
  const [pendingRunId, setPendingRunId] = useState<string | null>(null)

  // Selection state for artifact viewer + comparison
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)
  const [comparisonRunIds, setComparisonRunIds] = useState<string[]>([])

  // --- Execution history query ---
  const { data: historyPage, isLoading: isLoadingHistory } = useQuery({
    queryKey: queryKeys.executions.history(promptId, historyOffset),
    queryFn: () => executionService.getHistory(promptId, PAGE_SIZE, historyOffset),
    enabled: !!promptId,
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

  // --- AI Models query (reuse existing generationService) ---
  const { data: aiModels = [], isLoading: isLoadingModels } = useQuery<AIModel[]>({
    queryKey: queryKeys.executions.all,
    queryFn: () => generationService.getAIModels(),
    staleTime: 5 * 60_000,
  })

  // --- Trigger execution mutation ---
  const {
    mutate: triggerExecution,
    isPending: isTriggeringExecution,
    error: triggerError,
  } = useMutation({
    mutationFn: (dto: TriggerExecutionDTO) => executionService.triggerExecution(dto),
    onSuccess: (res) => {
      setPendingRunId(res.execution_run_id)
    },
  })

  // --- Polling: watch the pending run until it reaches a terminal state ---
  const { data: polledRun } = useQuery({
    queryKey: queryKeys.executions.run(pendingRunId ?? '__none__'),
    queryFn: () => executionService.pollStatus(pendingRunId!),
    enabled: !!pendingRunId,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (!status) return 2000
      return isTerminal(status) ? false : 2000
    },
    staleTime: 0,
  })

  useEffect(() => {
    if (!polledRun) return
    if (isTerminal(polledRun.status)) {
      setPendingRunId(null)
      // Invalidate history to show the new run
      queryClient.invalidateQueries({ queryKey: queryKeys.executions.history(promptId) })
      // Reset to first page so new run appears at top
      setHistoryOffset(0)
    }
  }, [polledRun?.status, promptId, queryClient])

  // --- Comparison toggle: max 2 runs ---
  const toggleComparison = useCallback((runId: string) => {
    setComparisonRunIds((prev) => {
      if (prev.includes(runId)) return prev.filter((id) => id !== runId)
      if (prev.length >= 2) return [prev[1], runId]
      return [...prev, runId]
    })
  }, [])

  const pendingRun = pendingRunId
    ? ({ id: pendingRunId, status: polledRun?.status ?? 'queued' } as Pick<ExecutionRun, 'id' | 'status'>)
    : null

  return {
    history: allHistory,
    isLoadingHistory,
    hasMoreHistory,
    loadMoreHistory,
    aiModels,
    isLoadingModels,
    pendingRun,
    triggerExecution,
    isTriggeringExecution,
    triggerError,
    selectedRunId,
    setSelectedRunId,
    comparisonRunIds,
    toggleComparison,
  }
}
