import { Badge, Button } from '@lenserfight/ui/components'
import { Clock, Loader, RotateCw } from 'lucide-react'
import React from 'react'

import { useWorkflowRunHistory } from '../hooks/useWorkflowRunHistory'
import type { WorkflowRunRecord } from '../hooks/useWorkflowRunHistory'
import { workflowsService } from '@lenserfight/data/repositories'
import { useMutation, useQueryClient } from '@tanstack/react-query'

type RunStatus = WorkflowRunRecord['status']

function badgeColorFor(status: RunStatus): 'green' | 'red' | 'blue' | 'yellow' | 'gray' {
  switch (status) {
    case 'completed': return 'green'
    case 'failed': case 'cancelled': case 'timed_out': return 'red'
    case 'running': case 'streaming': return 'blue'
    case 'pending': case 'queued': return 'yellow'
    default: return 'gray'
  }
}

function relativeTime(isoString: string | null | undefined): string {
  if (!isoString) return '—'
  const diff = Date.now() - new Date(isoString).getTime()
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function formatDuration(run: WorkflowRunRecord): string | null {
  if (!run.started_at || !run.completed_at) return null
  const ms = new Date(run.completed_at).getTime() - new Date(run.started_at).getTime()
  if (ms < 0) return null
  if (ms < 1000) return `${ms}ms`
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${s % 60}s`
}

export interface WorkflowRunHistoryPanelProps {
  workflowId: string
  activeRunId: string | null
  onSelectRun: (runId: string) => void
}

export const WorkflowRunHistoryPanel: React.FC<WorkflowRunHistoryPanelProps> = ({
  workflowId,
  activeRunId,
  onSelectRun,
}) => {
  const queryClient = useQueryClient()
  const { runs, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useWorkflowRunHistory(workflowId)

  const { mutate: retryRun, variables: retryingRunId } = useMutation({
    mutationFn: (runId: string) => workflowsService.updateRunStatus(runId, 'queued'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow', workflowId, 'runs'] })
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 p-8 text-sm text-greyscale-400">
        <Loader size={14} className="animate-spin" />
        Loading history…
      </div>
    )
  }

  if (runs.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-sm text-greyscale-400">
        No runs yet for this workflow.
      </div>
    )
  }

  const isRetryable = (status: string) => status === 'failed' || status === 'timed_out' || status === 'cancelled'

  return (
    <div className="space-y-1.5 p-4">
      {runs.map((run) => {
        const isActive = run.id === activeRunId
        const duration = formatDuration(run)
        const retryable = isRetryable(run.status)
        const isThisRetrying = retryingRunId === run.id

        return (
          <div key={run.id} className="group relative">
            <button
              type="button"
              onClick={() => onSelectRun(run.id)}
              className={`w-full text-left rounded-xl border p-3 transition-colors ${
                isActive
                  ? 'border-primary-yellow-500/50 bg-primary-yellow-500/5'
                  : 'border-surface-border bg-surface-raised hover:border-primary-yellow-500/30 hover:bg-primary-yellow-500/5'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <Badge color={badgeColorFor(run.status as RunStatus)} variant="outline" className="text-[10px] capitalize">
                  {run.status}
                </Badge>
                {run.trigger_mode && run.trigger_mode !== 'manual' && (
                  <Badge color="gray" variant="outline" className="text-[10px] capitalize">
                    {run.trigger_mode}
                  </Badge>
                )}
                {run.parent_run_id && (
                  <Badge
                    color="gray"
                    variant="outline"
                    className="text-[10px]"
                    title={`Parent run: ${run.parent_run_id}`}
                  >
                    ↳ sub
                  </Badge>
                )}
                {run.recursion_depth != null && run.recursion_depth > 0 && (
                  <Badge color="gray" variant="outline" className="text-[10px]">
                    depth:{run.recursion_depth}
                  </Badge>
                )}
                <span className="ml-auto flex items-center gap-1 text-[10px] text-greyscale-400 flex-shrink-0">
                  <Clock size={9} />
                  {relativeTime(run.completed_at ?? run.started_at ?? run.created_at)}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                {duration && (
                  <span className="text-[10px] text-greyscale-400">{duration}</span>
                )}
                {run.spent_credits != null && run.spent_credits > 0 && (
                  <span className="text-[10px] text-greyscale-400">
                    {duration ? '·' : ''} {run.spent_credits} cr
                  </span>
                )}
              </div>
            </button>

            {retryable && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  retryRun(run.id)
                }}
                disabled={isThisRetrying}
                title="Retry this run"
                className="absolute right-2 top-2 flex items-center gap-1 rounded-lg border border-status-red/20 bg-surface-base px-2 py-1 text-[10px] font-medium text-status-red opacity-0 transition-opacity group-hover:opacity-100 hover:bg-status-red/10 disabled:opacity-50"
              >
                {isThisRetrying ? (
                  <Loader size={9} className="animate-spin" />
                ) : (
                  <RotateCw size={9} />
                )}
                Retry
              </button>
            )}
          </div>
        )
      })}

      {hasNextPage && (
        <button
          type="button"
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-surface-border py-2 text-xs font-medium text-greyscale-400 hover:text-greyscale-700 hover:bg-surface-raised transition-colors disabled:opacity-50"
        >
          {isFetchingNextPage ? (
            <><Loader size={11} className="animate-spin" /> Loading…</>
          ) : (
            'Load more'
          )}
        </button>
      )}
    </div>
  )
}
