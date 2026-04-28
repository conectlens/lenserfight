import { queryKeys } from '@lenserfight/data/cache'
import { agentWorkspaceService } from '@lenserfight/data/repositories'
import type {
  ApprovalDecision,
  ApprovalRequestView,
  ApprovalStatus,
} from '@lenserfight/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Pencil, ShieldCheck, X } from 'lucide-react'
import React, { useState } from 'react'
import { ApprovalDecisionDialog } from '../ApprovalDecisionDialog'
import { EmptyPanel } from '../EmptyPanel'

interface ApprovalQueueSectionProps {
  aiLenserId: string
}

const FILTER_OPTIONS: Array<{ value: ApprovalStatus; label: string }> = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
]

/**
 * Approval queue control-room section. Reads from the `agents.approval_requests_v`
 * view; decisions are dispatched through `fn_decide_approval`, which:
 *   - mutates approval_status atomically
 *   - merges decision audit fields into team_runs.metadata
 *   - appends an agents.agent_run_events entry
 *   - resumes the underlying workflow_run (queued ← blocked) on approve/modify
 *     OR transitions the run to failed on reject
 */
export const ApprovalQueueSection: React.FC<ApprovalQueueSectionProps> = ({
  aiLenserId,
}) => {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<ApprovalStatus>('pending')
  const [activeDecision, setActiveDecision] = useState<{
    request: ApprovalRequestView
    decision: ApprovalDecision
  } | null>(null)

  const queueQuery = useQuery({
    queryKey: queryKeys.agents.approvals(aiLenserId, statusFilter),
    queryFn: () =>
      agentWorkspaceService.listApprovalRequests(aiLenserId, {
        status: statusFilter,
        limit: 100,
      }),
    enabled: !!aiLenserId,
    staleTime: 15_000,
  })

  const decideMutation = useMutation({
    mutationFn: (input: {
      request_id: string
      decision: ApprovalDecision
      reason: string
      modifications?: Record<string, unknown>
    }) =>
      agentWorkspaceService.decideApproval({
        team_run_id: input.request_id,
        decision: input.decision,
        reason: input.reason || null,
        modifications: input.modifications,
      }),
    onSuccess: async () => {
      setActiveDecision(null)
      await queryClient.invalidateQueries({
        queryKey: queryKeys.agents.approvals(aiLenserId, statusFilter),
      })
      await queryClient.invalidateQueries({
        queryKey: queryKeys.agents.workspaceBootstrap(''),
        exact: false,
      })
    },
  })

  const requests = queueQuery.data ?? []

  return (
    <section className="space-y-6">
      <div className="rounded-[28px] border border-amber-200/70 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-6 shadow-sm dark:border-amber-500/20 dark:from-[#1d160d] dark:via-[#101010] dark:to-[#180d08]">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700 dark:text-amber-300">
          Approval queue
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-gray-900 dark:text-white">
          Decide pending team runs
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600 dark:text-gray-300">
          Owner-authoritative gate for autonomous execution. Approvals resume
          blocked runs; rejections terminate them. Modify-and-approve overlays a
          jsonb input override before resume.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {FILTER_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setStatusFilter(option.value)}
            className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition ${
              statusFilter === option.value
                ? 'border-amber-500 bg-amber-100 text-amber-800 dark:border-amber-400 dark:bg-amber-500/20 dark:text-amber-200'
                : 'border-gray-200 text-gray-600 hover:border-amber-300 dark:border-gray-700 dark:text-gray-300'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {queueQuery.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div
              key={idx}
              className="h-24 animate-pulse rounded-2xl border border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-900"
            />
          ))}
        </div>
      ) : queueQuery.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
          Failed to load approvals: {(queueQuery.error as Error).message}
        </div>
      ) : requests.length === 0 ? (
        <EmptyPanel
          icon={<ShieldCheck size={22} />}
          title={`No ${statusFilter} approvals`}
          description={
            statusFilter === 'pending'
              ? 'Autonomous team runs that hit a gate (publish, spend, external message, schedule change, etc.) will appear here for your decision.'
              : `No ${statusFilter} approvals on record for this workspace.`
          }
        />
      ) : (
        <div className="space-y-3">
          {requests.map((request) => (
            <div
              key={request.request_id}
              className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                      {request.gate_kind ?? 'gate'}
                    </span>
                    <span className="rounded-full border border-gray-200 px-2.5 py-1 text-[11px] font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-300">
                      run · {request.run_status}
                    </span>
                    {request.assignee_kind && (
                      <span className="rounded-full border border-gray-200 px-2.5 py-1 text-[11px] font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-300">
                        {request.assignee_kind}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {request.workflow_title ?? 'Untitled workflow'}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {request.requested_action ?? 'Pending owner decision.'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Requested {new Date(request.requested_at).toLocaleString()} ·{' '}
                    {request.requester_agent_id
                      ? `by agent ${request.requester_agent_id.slice(0, 8)}…`
                      : 'no requester recorded'}
                  </p>
                </div>
                {statusFilter === 'pending' && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setActiveDecision({ request, decision: 'rejected' })
                      }
                      className="inline-flex items-center gap-1.5 rounded-2xl border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 transition hover:border-red-400 hover:bg-red-50 dark:border-red-500/30 dark:bg-gray-900 dark:text-red-300 dark:hover:bg-red-500/10"
                    >
                      <X size={16} /> Reject
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setActiveDecision({ request, decision: 'modified' })
                      }
                      className="inline-flex items-center gap-1.5 rounded-2xl border border-amber-200 bg-white px-3 py-2 text-sm font-semibold text-amber-700 transition hover:border-amber-400 hover:bg-amber-50 dark:border-amber-500/30 dark:bg-gray-900 dark:text-amber-300 dark:hover:bg-amber-500/10"
                    >
                      <Pencil size={16} /> Modify
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setActiveDecision({ request, decision: 'approved' })
                      }
                      className="inline-flex items-center gap-1.5 rounded-2xl bg-amber-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-amber-500"
                    >
                      <Check size={16} /> Approve
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <ApprovalDecisionDialog
        request={activeDecision?.request ?? null}
        decision={activeDecision?.decision ?? null}
        isSubmitting={decideMutation.isPending}
        onSubmit={(input) => decideMutation.mutate(input)}
        onClose={() => {
          if (!decideMutation.isPending) setActiveDecision(null)
        }}
      />
    </section>
  )
}
