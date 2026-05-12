import React from 'react'
import type { PublicExecutionJobRecord } from '../../hooks/query/useExecutionJobs'
import type { Contender } from '../../types/battle.types'
import { ProviderBadge } from './ProviderBadge'

interface ExecutionMetadataPanelProps {
  executionJobs: PublicExecutionJobRecord[]
  contenders: Contender[]
}

function formatDuration(startedAt: string | null, completedAt: string | null): string {
  if (!startedAt || !completedAt) return '—'
  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime()
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-xs border-b border-surface-border-subtle last:border-0">
      <span className="text-surface-text-muted font-medium">{label}</span>
      <span className="text-surface-text font-semibold tabular-nums">{value}</span>
    </div>
  )
}

export function ExecutionMetadataPanel({ executionJobs, contenders }: ExecutionMetadataPanelProps) {
  if (executionJobs.length === 0) return null

  return (
    <div className="rounded-xl border border-surface-border bg-surface-raised p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-surface-text-disabled mb-3">
        Execution Metadata
      </p>

      <div className="space-y-4">
        {executionJobs.map((job) => {
          const contender = contenders.find((c) => c.id === job.contender_id)
          const label = contender?.display_name ?? `Slot ${job.slot}`
          const duration = formatDuration(job.claimed_at, job.completed_at)

          return (
            <div key={job.id} className="space-y-1">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="h-5 w-5 rounded-md bg-primary-yellow-500 flex items-center justify-center text-[10px] font-black text-dark-900">
                  {job.slot}
                </div>
                <span className="text-xs font-semibold text-surface-text truncate">{label}</span>
              </div>

              <MetaRow label="Status" value={
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  job.status === 'completed' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' :
                  job.status === 'failed' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                  job.status === 'running' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                  'bg-surface-interactive text-surface-text-muted'
                }`}>{job.status}</span>
              } />

              <MetaRow label="Duration" value={duration} />

              {job.retry_count > 0 && (
                <MetaRow label="Retries" value={
                  <span className="text-amber-600 dark:text-amber-400">{job.retry_count}</span>
                } />
              )}

              {job.error_message && (
                <div className="mt-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2">
                  <p className="text-[10px] font-bold text-red-700 dark:text-red-300 uppercase tracking-wider mb-0.5">Error</p>
                  <p className="text-xs text-red-600 dark:text-red-400 leading-relaxed line-clamp-3">{job.error_message}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
