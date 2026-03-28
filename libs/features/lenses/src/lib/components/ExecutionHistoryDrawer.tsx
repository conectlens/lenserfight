import { Badge } from '@lenserfight/ui/components'
import { Drawer } from '@lenserfight/ui/overlays'
import { executionService } from '@lenserfight/data/repositories'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@lenserfight/data/cache'
import type { LensExecutionHistoryItem, ExecutionArtifact } from '@lenserfight/types'
import { Loader2, ChevronDown, ChevronUp, Zap, Clock, Coins, ArrowLeft, Copy, Check } from 'lucide-react'
import React, { useCallback, useEffect, useRef, useState } from 'react'

// ─── Status badge ────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, 'green' | 'red' | 'yellow' | 'gray'> = {
  succeeded: 'green',
  failed: 'red',
  running: 'yellow',
  queued: 'gray',
  canceled: 'gray',
  timed_out: 'red',
}

function RunStatusBadge({ status }: { status: string | null }) {
  const s = status ?? 'unknown'
  return (
    <Badge color={STATUS_COLORS[s] ?? 'gray'} variant="outline">
      {s}
    </Badge>
  )
}

// ─── Copy button ─────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handle = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      type="button"
      onClick={handle}
      className="flex items-center gap-1 text-xs text-greyscale-500 transition-colors hover:text-greyscale-700 dark:hover:text-greyscale-300"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

// ─── Full run output drawer ───────────────────────────────────────────────────

function FullRunOutput({ runId, onBack }: { runId: string; onBack: () => void }) {
  const { data: artifacts = [], isLoading } = useQuery<ExecutionArtifact[]>({
    queryKey: queryKeys.executions.artifacts(runId),
    queryFn: () => executionService.getArtifacts(runId),
    enabled: !!runId,
    staleTime: 60_000,
  })

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 self-start text-xs text-greyscale-500 hover:text-greyscale-700 dark:hover:text-greyscale-300 transition-colors"
      >
        <ArrowLeft size={12} />
        Back to history
      </button>

      <p className="font-mono text-[11px] text-greyscale-400">{runId}</p>

      {isLoading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-greyscale-500">
          <Loader2 size={14} className="animate-spin" />
          Loading output…
        </div>
      ) : artifacts.length === 0 ? (
        <p className="py-6 text-center text-sm text-greyscale-400 italic">No artifacts found.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {artifacts.map((artifact) => {
            if (artifact.contentText) {
              return (
                <div key={artifact.id} className="overflow-hidden rounded-2xl border border-surface-border">
                  <div className="relative">
                    <div className="absolute top-2 right-2 z-10">
                      <CopyButton text={artifact.contentText} />
                    </div>
                    <pre className="whitespace-pre-wrap break-words bg-surface-raised p-4 pr-20 font-mono text-sm leading-relaxed text-greyscale-700 dark:text-greyscale-200">
                      {artifact.contentText}
                    </pre>
                  </div>
                </div>
              )
            }
            if (artifact.contentJson !== null && artifact.contentJson !== undefined) {
              const pretty = JSON.stringify(artifact.contentJson, null, 2)
              return (
                <div key={artifact.id} className="overflow-hidden rounded-2xl border border-surface-border">
                  <div className="relative">
                    <div className="absolute top-2 right-2 z-10">
                      <CopyButton text={pretty} />
                    </div>
                    <pre className="whitespace-pre-wrap break-words bg-surface-raised p-4 pr-20 font-mono text-sm leading-relaxed text-greyscale-700 dark:text-greyscale-200">
                      {pretty}
                    </pre>
                  </div>
                </div>
              )
            }
            return null
          })}
        </div>
      )}
    </div>
  )
}

// ─── Expanded run detail (preview) ───────────────────────────────────────────

function RunDetail({ runId }: { runId: string }) {
  const { data: artifacts, isLoading } = useQuery<ExecutionArtifact[]>({
    queryKey: queryKeys.executions.artifacts(runId),
    queryFn: () => executionService.getArtifacts(runId),
    enabled: !!runId,
    staleTime: 60_000,
  })

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-3 text-xs text-greyscale-500">
        <Loader2 size={12} className="animate-spin" />
        Loading artifacts…
      </div>
    )
  }

  const primary = artifacts?.find((a) => a.isPrimaryOutput)
  const text = primary?.contentText ?? artifacts?.[0]?.contentText

  if (!text) {
    return <p className="py-2 text-xs text-greyscale-400 italic">No output available.</p>
  }

  return (
    <div className="mt-2 rounded-xl border border-surface-border bg-surface-base p-3">
      <p className="max-h-48 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-greyscale-700 dark:text-greyscale-300">
        {text.length > 500 ? text.slice(0, 500) + '…' : text}
      </p>
    </div>
  )
}

// ─── Filter bar ──────────────────────────────────────────────────────────────

type StatusFilter = 'all' | 'succeeded' | 'failed'

function FilterBar({
  status,
  onStatusChange,
}: {
  status: StatusFilter
  onStatusChange: (s: StatusFilter) => void
}) {
  const options: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'succeeded', label: 'Succeeded' },
    { value: 'failed', label: 'Failed' },
  ]

  return (
    <div className="flex gap-1.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onStatusChange(opt.value)}
          className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${status === opt.value
              ? 'bg-primary-yellow-500/15 text-primary-yellow-600'
              : 'bg-surface-base text-greyscale-500 hover:bg-surface-raised hover:text-greyscale-700 dark:hover:text-greyscale-300'
            }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

interface ExecutionHistoryDrawerProps {
  open: boolean
  onClose: () => void
  lensId: string
  history: LensExecutionHistoryItem[]
  isLoadingHistory: boolean
  hasMoreHistory: boolean
  loadMoreHistory: () => void
  onSelectRun: (runId: string) => void
}

export function ExecutionHistoryDrawer({
  open,
  onClose,
  lensId,
  history,
  isLoadingHistory,
  hasMoreHistory,
  loadMoreHistory,
  onSelectRun,
}: ExecutionHistoryDrawerProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null)
  const [viewOutputRunId, setViewOutputRunId] = useState<string | null>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // Infinite scroll sentinel
  useEffect(() => {
    if (!open || !hasMoreHistory) return
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadMoreHistory()
      },
      { rootMargin: '100px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [open, hasMoreHistory, loadMoreHistory])

  const filtered = statusFilter === 'all'
    ? history
    : history.filter((h) => h.runStatus === statusFilter)

  const toggleExpand = useCallback((runId: string | null) => {
    setExpandedRunId((prev) => (prev === runId ? null : runId))
  }, [])

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        side="right"
        width="w-80 sm:w-[28rem] lg:w-[32rem]"
        title="Execution History"
      >
        <div className="space-y-4">
          <FilterBar status={statusFilter} onStatusChange={setStatusFilter} />

          {isLoadingHistory && filtered.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-greyscale-500">
              <Loader2 size={14} className="animate-spin" />
              Loading executions…
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-12 text-center text-sm text-greyscale-400">
              No executions found.{statusFilter !== 'all' && ' Try a different filter.'}
            </p>
          ) : (
            <div className="space-y-2">
              {filtered.map((item) => {
                const isExpanded = expandedRunId === item.runId
                return (
                  <div
                    key={item.requestId}
                    className={`rounded-xl border transition-colors ${isExpanded
                        ? 'border-primary-yellow-500/40 bg-primary-yellow-500/5'
                        : 'border-surface-border bg-surface-base'
                      }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleExpand(item.runId)}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
                    >
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <RunStatusBadge status={item.runStatus} />
                          {item.providerKey && (
                            <span className="text-[11px] font-medium text-greyscale-500 uppercase">
                              {item.providerKey}
                            </span>
                          )}
                          {item.modelKey && (
                            <span className="truncate text-xs text-greyscale-600 dark:text-greyscale-400">
                              {item.modelKey}
                            </span>
                          )}
                          {item.fundingSource === 'user_byok_local' && (
                            <Badge color="blue" variant="outline">Local</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-greyscale-400">
                          <span className="flex items-center gap-1">
                            <Clock size={10} />
                            {new Date(item.createdAt).toLocaleString(undefined, {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })}
                          </span>
                          {(item.tokenInput || item.tokenOutput) && (
                            <span className="flex items-center gap-1">
                              <Zap size={10} />
                              {item.tokenInput ?? 0}→{item.tokenOutput ?? 0}
                            </span>
                          )}
                          {item.creditCost != null && item.creditCost > 0 && (
                            <span className="flex items-center gap-1">
                              <Coins size={10} />
                              {item.creditCost}
                            </span>
                          )}
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp size={14} className="flex-shrink-0 text-greyscale-400" />
                      ) : (
                        <ChevronDown size={14} className="flex-shrink-0 text-greyscale-400" />
                      )}
                    </button>

                    {isExpanded && item.runId && (
                      <div className="border-t border-surface-border px-3 pb-3">
                        <RunDetail runId={item.runId} />
                        <button
                          type="button"
                          onClick={() => setViewOutputRunId(item.runId!)}
                          className="mt-2 text-xs font-medium text-primary-yellow-600 hover:text-primary-yellow-700 transition-colors"
                        >
                          View full output →
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}

              {hasMoreHistory && <div ref={sentinelRef} className="h-2" />}
              {isLoadingHistory && filtered.length > 0 && (
                <div className="flex justify-center py-2">
                  <Loader2 size={12} className="animate-spin text-greyscale-400" />
                </div>
              )}
            </div>
          )}
        </div>
      </Drawer>

      <Drawer
        open={!!viewOutputRunId}
        onClose={() => setViewOutputRunId(null)}
        side="right"
        width="w-full sm:w-[40rem] lg:w-[48rem]"
        title="Full Output"
      >
        {viewOutputRunId && (
          <FullRunOutput runId={viewOutputRunId} onBack={() => setViewOutputRunId(null)} />
        )}
      </Drawer>
    </>
  )
}
