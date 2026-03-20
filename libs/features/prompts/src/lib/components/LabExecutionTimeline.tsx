import React, { useCallback, useRef } from 'react'
import { CheckCircle, XCircle, Clock, Loader2, Zap } from 'lucide-react'
import { PromptExecutionRecord, ExecutionRunStatus } from '@lenserfight/types'

interface LabExecutionTimelineProps {
  history: PromptExecutionRecord[]
  isLoading: boolean
  hasMore: boolean
  selectedRunId: string | null
  comparisonRunIds: string[]
  onSelectRun: (runId: string) => void
  onToggleComparison: (runId: string) => void
  onLoadMore: () => void
}

const STATUS_ICON: Record<ExecutionRunStatus, React.ReactNode> = {
  succeeded: <CheckCircle size={14} className="text-green-500" />,
  failed: <XCircle size={14} className="text-red-500" />,
  canceled: <XCircle size={14} className="text-gray-400" />,
  timed_out: <Clock size={14} className="text-yellow-500" />,
  queued: <Loader2 size={14} className="text-blue-400 animate-spin" />,
  running: <Loader2 size={14} className="text-blue-500 animate-spin" />,
}

const STATUS_COLOR: Record<ExecutionRunStatus, string> = {
  succeeded: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  canceled: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  timed_out: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  queued: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  running: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
}

function formatLatency(ms: number | null | undefined): string {
  if (!ms) return '—'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function formatTokens(input: number | null | undefined, output: number | null | undefined): string {
  const total = (input ?? 0) + (output ?? 0)
  if (total === 0) return '—'
  return `${total.toLocaleString()} tok`
}

function formatCost(credits: number | null | undefined): string {
  if (credits === null || credits === undefined) return 'free'
  return `${credits} cr`
}

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function groupByDate(records: PromptExecutionRecord[]): [string, PromptExecutionRecord[]][] {
  const map = new Map<string, PromptExecutionRecord[]>()
  for (const r of records) {
    const date = r.createdAt.split('T')[0]
    const existing = map.get(date) ?? []
    existing.push(r)
    map.set(date, existing)
  }
  return Array.from(map.entries())
}

export const LabExecutionTimeline: React.FC<LabExecutionTimelineProps> = ({
  history,
  isLoading,
  hasMore,
  selectedRunId,
  comparisonRunIds,
  onSelectRun,
  onToggleComparison,
  onLoadMore,
}) => {
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  const lastRowRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (isLoading) return
      if (observerRef.current) observerRef.current.disconnect()
      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          onLoadMore()
        }
      })
      if (node) observerRef.current.observe(node)
    },
    [isLoading, hasMore, onLoadMore]
  )

  const groups = groupByDate(history)

  if (history.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center text-gray-400 dark:text-gray-500">
        <Zap size={28} className="mb-3 opacity-40" />
        <p className="text-sm">No executions yet. Run the prompt to see results here.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {groups.map(([date, records]) => (
        <div key={date}>
          <div className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide px-1 pb-1 pt-2">
            {new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
          {records.map((record, idx) => {
            const run = record.run
            const isSelected = run ? selectedRunId === run.id : false
            const isInComparison = run ? comparisonRunIds.includes(run.id) : false
            const isLast = idx === records.length - 1 && groups[groups.length - 1][0] === date

            return (
              <div
                key={record.id}
                ref={isLast ? lastRowRef : undefined}
                onClick={() => run && onSelectRun(run.id)}
                className={`
                  group flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors
                  ${isSelected
                    ? 'bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-700'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800 border border-transparent'
                  }
                `}
              >
                {/* Status icon */}
                <div className="flex-shrink-0">
                  {run ? STATUS_ICON[run.status] : <Clock size={14} className="text-gray-300" />}
                </div>

                {/* Status badge */}
                {run && (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[run.status]}`}>
                    {run.status}
                  </span>
                )}

                {/* Metadata */}
                <div className="flex flex-1 items-center gap-3 text-xs text-gray-500 dark:text-gray-400 min-w-0">
                  {run && (
                    <>
                      <span>{formatLatency(run.latencyMs)}</span>
                      <span className="hidden sm:inline">{formatTokens(run.tokenInput, run.tokenOutput)}</span>
                      <span className="hidden md:inline">{formatCost(run.creditCost)}</span>
                    </>
                  )}
                </div>

                {/* Timestamp */}
                <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                  {formatRelativeTime(record.createdAt)}
                </span>

                {/* Comparison toggle */}
                {run && run.status === 'succeeded' && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onToggleComparison(run.id) }}
                    title={isInComparison ? 'Remove from comparison' : 'Add to comparison (max 2)'}
                    className={`
                      flex-shrink-0 w-5 h-5 rounded border text-xs font-bold transition-colors
                      ${isInComparison
                        ? 'border-primary-500 bg-primary-500 text-white'
                        : 'border-gray-300 dark:border-gray-600 text-gray-400 opacity-0 group-hover:opacity-100'
                      }
                    `}
                  >
                    {comparisonRunIds.indexOf(run.id) + 1 || ''}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      ))}

      {/* Sentinel for infinite scroll + loading indicator */}
      <div ref={sentinelRef} />
      {isLoading && (
        <div className="flex justify-center py-4">
          <Loader2 size={18} className="animate-spin text-gray-400" />
        </div>
      )}
    </div>
  )
}
