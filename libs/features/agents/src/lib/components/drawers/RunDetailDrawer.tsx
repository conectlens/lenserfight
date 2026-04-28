import { queryKeys } from '@lenserfight/data/cache'
import { agentWorkspaceService } from '@lenserfight/data/repositories'
import type { AgentRunStepRecord, AgentTeamRunRecord } from '@lenserfight/types'
import { Drawer } from '@lenserfight/ui/overlays'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, RotateCcw, X } from 'lucide-react'
import React from 'react'
import { toast } from 'sonner'

import { formatDateTime } from '../sections/_shared'

interface Props {
  open: boolean
  onClose: () => void
  run: AgentTeamRunRecord | null
  aiLenserId: string
  handle: string
}

const STATUS_COLORS: Record<string, string> = {
  queued: 'border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-400',
  running: 'border-amber-200 text-amber-700 dark:border-amber-500/30 dark:text-amber-300',
  blocked: 'border-orange-200 text-orange-700 dark:border-orange-500/30 dark:text-orange-300',
  completed: 'border-green-200 text-green-700 dark:border-green-500/30 dark:text-green-300',
  failed: 'border-red-200 text-red-700 dark:border-red-500/30 dark:text-red-400',
  cancelled: 'border-gray-200 text-gray-400 dark:border-gray-700 dark:text-gray-500',
}

const StatusPill: React.FC<{ status: string }> = ({ status }) => (
  <span
    className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_COLORS[status] ?? STATUS_COLORS.queued}`}
  >
    {status}
  </span>
)

const StepCard: React.FC<{ step: AgentRunStepRecord }> = ({ step }) => (
  <div className="rounded-[16px] border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-semibold text-gray-900 dark:text-white">{step.title}</span>
      <StatusPill status={step.status} />
      <span className="rounded-full border border-gray-200 px-2 py-0.5 text-[11px] font-semibold text-gray-500 dark:border-gray-700 dark:text-gray-400">
        lane {step.lane}
      </span>
    </div>
    {step.current_task && (
      <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">{step.current_task}</p>
    )}
    {step.recent_output_summary && (
      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{step.recent_output_summary}</p>
    )}
    {step.blocker_summary && (
      <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-amber-200 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:border-amber-500/30 dark:text-amber-300">
        <AlertTriangle size={11} />
        {step.blocker_summary}
      </p>
    )}
  </div>
)

export const RunDetailDrawer: React.FC<Props> = ({ open, onClose, run, aiLenserId, handle }) => {
  const queryClient = useQueryClient()

  const steps = useQuery<AgentRunStepRecord[]>({
    queryKey: queryKeys.agents.runSteps(aiLenserId, run?.id ?? ''),
    queryFn: () => agentWorkspaceService.listAgentRunSteps(aiLenserId, run!.id),
    enabled: open && !!run,
    staleTime: 10_000,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.agents.workspaceBootstrap(handle),
    })
  }

  const cancel = useMutation({
    mutationFn: () => agentWorkspaceService.cancelAgentRun(aiLenserId, run!.id),
    onSuccess: () => {
      toast.success('Run cancelled')
      invalidate()
      onClose()
    },
    onError: (e) => toast.error((e as Error).message),
  })

  const retry = useMutation({
    mutationFn: () => agentWorkspaceService.retryAgentRun(aiLenserId, run!.id),
    onSuccess: () => {
      toast.success('Run queued for retry')
      invalidate()
      onClose()
    },
    onError: (e) => toast.error((e as Error).message),
  })

  const isPending = cancel.isPending || retry.isPending
  const canCancel = run?.status === 'running' || run?.status === 'queued'
  const canRetry = run?.status === 'failed'

  return (
    <Drawer open={open} onClose={onClose} side="right" width="w-[560px]" title="Run detail">
      {run && (
        <div className="space-y-5">
          <div className="rounded-[20px] border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950">
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
                  Run ID
                </span>
                <span className="font-mono text-xs text-gray-700 dark:text-gray-300">
                  {run.id.slice(0, 8)}…{run.id.slice(-4)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
                  Status
                </span>
                <StatusPill status={run.status} />
              </div>
              {run.approval_status && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
                    Approval
                  </span>
                  <span className="text-xs text-gray-700 dark:text-gray-300">{run.approval_status}</span>
                </div>
              )}
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
                  Started
                </span>
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {run.started_at ? formatDateTime(run.started_at) : '—'}
                </span>
              </div>
              {run.completed_at && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
                    Completed
                  </span>
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {formatDateTime(run.completed_at)}
                  </span>
                </div>
              )}
              {run.workflow_id && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
                    Workflow
                  </span>
                  <span className="font-mono text-xs text-gray-600 dark:text-gray-400">
                    {run.workflow_id.slice(0, 8)}…
                  </span>
                </div>
              )}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
              Execution steps{steps.data ? ` (${steps.data.length})` : ''}
            </p>
            {steps.isLoading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-16 animate-pulse rounded-[16px] border border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-900"
                  />
                ))}
              </div>
            ) : (steps.data ?? []).length === 0 ? (
              <p className="rounded-[16px] border border-gray-100 bg-gray-50 px-4 py-5 text-center text-xs text-gray-400 dark:border-gray-800 dark:bg-gray-950">
                No steps recorded for this run.
              </p>
            ) : (
              <div className="space-y-2">
                {(steps.data ?? []).map((step) => (
                  <StepCard key={step.id} step={step} />
                ))}
              </div>
            )}
          </div>

          {(canCancel || canRetry) && (
            <div className="flex gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
              {canCancel && (
                <button
                  type="button"
                  onClick={() => cancel.mutate()}
                  disabled={isPending}
                  className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
                >
                  <X size={14} />
                  {cancel.isPending ? 'Cancelling…' : 'Cancel run'}
                </button>
              )}
              {canRetry && (
                <button
                  type="button"
                  onClick={() => retry.mutate()}
                  disabled={isPending}
                  className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-amber-300 hover:text-amber-700 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200"
                >
                  <RotateCcw size={14} />
                  {retry.isPending ? 'Retrying…' : 'Retry run'}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </Drawer>
  )
}
