import { Badge } from '@lenserfight/ui/components'
import { Clock, Loader } from 'lucide-react'
import React from 'react'

import { useWorkflowRunHistory } from '../hooks/useWorkflowRunHistory'
import type { WorkflowRunRecord } from '../hooks/useWorkflowRunHistory'

type RunStatus = WorkflowRunRecord['status']

function badgeColorFor(status: RunStatus): 'green' | 'red' | 'blue' | 'yellow' | 'gray' {
  switch (status) {
    case 'completed': return 'green'
    case 'failed': case 'cancelled': return 'red'
    case 'running': return 'blue'
    case 'pending': return 'yellow'
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

export interface WorkflowRunHistoryPanelProps {
  workflowId: string
  activeRunId: string | null
  onSelectRun: (runId: string) => void
}

/**
 * Displays a paginated list of past workflow runs.
 * Pure Information Expert — all run history logic lives in useWorkflowRunHistory.
 */
export const WorkflowRunHistoryPanel: React.FC<WorkflowRunHistoryPanelProps> = ({
  workflowId,
  activeRunId,
  onSelectRun,
}) => {
  const { data: runs = [], isLoading } = useWorkflowRunHistory(workflowId)

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

  return (
    <div className="space-y-1.5 p-4">
      {runs.map((run) => {
        const isActive = run.id === activeRunId
        return (
          <button
            key={run.id}
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
              <span className="ml-auto flex items-center gap-1 text-[10px] text-greyscale-400 flex-shrink-0">
                <Clock size={9} />
                {relativeTime(run.completed_at ?? run.started_at ?? run.created_at)}
              </span>
            </div>
            {run.spent_credits != null && run.spent_credits > 0 && (
              <p className="mt-1 text-[10px] text-greyscale-400">
                {run.spent_credits} credits
              </p>
            )}
          </button>
        )
      })}
    </div>
  )
}
