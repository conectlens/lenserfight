import { Badge } from '@lenserfight/ui/components'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  Ban,
  CheckCircle,
  ChevronDown,
  Clock,
  Hourglass,
  Loader,
  RotateCw,
  ShieldAlert,
  SkipForward,
  TimerOff,
  XCircle,
} from 'lucide-react'
import React, { useState } from 'react'

import type {
  WorkflowNodeRecord,
  WorkflowEdgeRecord,
  WorkflowNodeResultRecord,
} from '@lenserfight/data/repositories'

interface WorkflowProgressViewProps {
  nodes: WorkflowNodeRecord[]
  edges: WorkflowEdgeRecord[]
  nodeResults: WorkflowNodeResultRecord[]
}

type NodeStatus = WorkflowNodeResultRecord['status']

// Phase 8 — expanded state machine. Every status in the Phase 1 union must
// have an icon + colour mapping so the UI never renders an "unknown" box.
const STATUS_ICONS: Record<NodeStatus, React.ReactNode> = {
  pending: <Clock size={14} className="text-greyscale-400" />,
  awaiting_dependency: <Hourglass size={14} className="text-greyscale-400" />,
  queued: <Clock size={14} className="text-greyscale-500" />,
  running: <Loader size={14} className="text-primary-yellow-600 animate-spin" />,
  streaming: <Loader size={14} className="text-primary-yellow-600 animate-spin" />,
  retrying: <RotateCw size={14} className="text-primary-yellow-600 animate-spin" />,
  completed: <CheckCircle size={14} className="text-status-green" />,
  failed: <XCircle size={14} className="text-status-red" />,
  cancelled: <XCircle size={14} className="text-status-red" />,
  skipped: <SkipForward size={14} className="text-greyscale-500" />,
  timed_out: <TimerOff size={14} className="text-status-red" />,
  blocked: <Ban size={14} className="text-status-red" />,
  invalidated: <ShieldAlert size={14} className="text-status-red" />,
}

const STATUS_COLORS: Record<NodeStatus, string> = {
  pending: 'border-surface-border bg-surface-base',
  awaiting_dependency: 'border-surface-border bg-surface-base',
  queued: 'border-surface-border bg-surface-base',
  running: 'border-primary-yellow-500 bg-primary-yellow-500/5',
  streaming: 'border-primary-yellow-500 bg-primary-yellow-500/5',
  retrying: 'border-primary-yellow-500/60 bg-primary-yellow-500/5',
  completed: 'border-status-green bg-status-green/5',
  failed: 'border-status-red bg-status-red/5',
  cancelled: 'border-status-red bg-status-red/5',
  skipped: 'border-surface-border bg-surface-base opacity-70',
  timed_out: 'border-status-red bg-status-red/5',
  blocked: 'border-status-red bg-status-red/5',
  invalidated: 'border-status-red bg-status-red/5',
}

const STATUS_LABELS: Record<NodeStatus, string> = {
  pending: 'Pending',
  awaiting_dependency: 'Awaiting',
  queued: 'Queued',
  running: 'Running',
  streaming: 'Streaming',
  retrying: 'Retrying',
  completed: 'Completed',
  failed: 'Failed',
  cancelled: 'Canceled',
  skipped: 'Skipped',
  timed_out: 'Timed out',
  blocked: 'Blocked',
  invalidated: 'Invalidated',
}

function badgeColorFor(status: NodeStatus): 'green' | 'red' | 'blue' | 'yellow' | 'gray' {
  switch (status) {
    case 'completed':
      return 'green'
    case 'failed':
    case 'cancelled':
    case 'timed_out':
    case 'blocked':
    case 'invalidated':
      return 'red'
    case 'running':
    case 'streaming':
      return 'blue'
    case 'retrying':
      return 'yellow'
    default:
      return 'gray'
  }
}

/** Detects media type from output_data and renders the appropriate element. */
function OutputRenderer({ data }: { data: Record<string, unknown> }) {
  const [expanded, setExpanded] = useState(false)
  const mediaType = data['mediaType'] as string | undefined
  const url = data['url'] as string | undefined
  const text = (data['output'] ?? data['text']) as string | undefined
  const mimeType = data['mimeType'] as string | undefined

  // Image
  if ((mediaType === 'image' || mimeType?.startsWith('image/')) && url) {
    return (
      <div className="mt-3 space-y-2">
        <img
          src={url}
          alt="Node output"
          className="w-full rounded-xl border border-surface-border object-contain max-h-64"
          loading="lazy"
        />
      </div>
    )
  }

  // Video
  if ((mediaType === 'video' || mimeType?.startsWith('video/')) && url) {
    return (
      <div className="mt-3">
        <video
          src={url}
          controls
          className="w-full rounded-xl border border-surface-border max-h-64"
          preload="metadata"
        />
      </div>
    )
  }

  // Audio
  if ((mediaType === 'audio' || mimeType?.startsWith('audio/')) && url) {
    return (
      <div className="mt-3">
        <audio src={url} controls className="w-full" preload="metadata" />
      </div>
    )
  }

  // Text output — expandable
  if (text && typeof text === 'string') {
    const isLong = text.length > 200
    const displayText = expanded || !isLong ? text : text.slice(0, 200) + '…'

    return (
      <div className="mt-3 space-y-1">
        <div className="rounded-xl bg-surface-base p-3 text-xs text-greyscale-600 dark:text-greyscale-400 font-mono whitespace-pre-wrap break-words leading-relaxed">
          {displayText}
        </div>
        {isLong && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-[10px] font-medium text-greyscale-400 hover:text-greyscale-600 transition-colors"
          >
            <ChevronDown size={10} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
            {expanded ? 'Collapse' : 'Show full output'}
          </button>
        )}
      </div>
    )
  }

  // Fallback: raw JSON
  const json = JSON.stringify(data, null, 2)
  const isLong = json.length > 200
  const displayJson = expanded || !isLong ? json : json.slice(0, 200) + '…'

  return (
    <div className="mt-3 space-y-1">
      <div className="rounded-xl bg-surface-base p-3 text-xs text-greyscale-600 dark:text-greyscale-400 font-mono whitespace-pre-wrap break-words leading-relaxed">
        {displayJson}
      </div>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1 text-[10px] font-medium text-greyscale-400 hover:text-greyscale-600 transition-colors"
        >
          <ChevronDown size={10} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
          {expanded ? 'Collapse' : 'Show full output'}
        </button>
      )}
    </div>
  )
}

/** Skeleton loader for pending nodes */
function PendingSkeleton() {
  return (
    <div className="mt-3 space-y-2">
      <div className="h-3 w-3/4 rounded bg-surface-raised animate-pulse" />
      <div className="h-3 w-1/2 rounded bg-surface-raised animate-pulse" />
    </div>
  )
}

/** Streaming text indicator for running nodes */
function RunningIndicator({ data }: { data?: Record<string, unknown> | null }) {
  const partialText = (data?.['output'] ?? data?.['text']) as string | undefined

  return (
    <div className="mt-3 space-y-2">
      {partialText ? (
        <div className="rounded-xl bg-surface-base p-3 text-xs text-greyscale-600 dark:text-greyscale-400 font-mono whitespace-pre-wrap break-words leading-relaxed">
          {partialText}
          <span className="inline-block w-1.5 h-3 ml-0.5 bg-primary-yellow-500 animate-pulse rounded-sm" />
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-xl bg-surface-base p-3">
          <Loader size={12} className="text-primary-yellow-600 animate-spin" />
          <span className="text-xs text-greyscale-400">Generating…</span>
        </div>
      )}
    </div>
  )
}

export function WorkflowProgressView({ nodes, nodeResults }: WorkflowProgressViewProps) {
  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-sm text-greyscale-400">
        No nodes in this workflow.
      </div>
    )
  }

  const getResult = (nodeId: string) => nodeResults.find((r) => r.node_id === nodeId)

  return (
    <div className="space-y-3 p-4">
      {nodes
        .slice()
        .sort((a, b) => a.ordinal - b.ordinal)
        .map((node) => {
          const result = getResult(node.id)
          const status: NodeStatus = result?.status ?? 'pending'
          const isActive = status === 'running' || status === 'streaming' || status === 'retrying'
          const displayStatus = STATUS_LABELS[status]

          return (
            <motion.div
              key={node.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`relative rounded-2xl border p-4 transition-colors ${STATUS_COLORS[status]} ${isActive ? 'ring-2 ring-primary-yellow-500/30' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-surface-raised text-xs font-bold text-greyscale-500">
                  {node.ordinal + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-greyscale-900 dark:text-greyscale-50 truncate">
                    {node.label || `Node ${node.ordinal + 1}`}
                  </p>
                  {/* Retry badge — visible only once retries have occurred. */}
                  {(result?.retry_count ?? 0) > 0 && (
                    <p className="text-[10px] text-greyscale-400 mt-0.5">
                      {result!.retry_count} retr{result!.retry_count === 1 ? 'y' : 'ies'}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  {STATUS_ICONS[status]}
                  <Badge color={badgeColorFor(status)} variant="outline">
                    {displayStatus}
                  </Badge>
                </div>
              </div>

              {/* Pending / awaiting — skeleton loader */}
              {(status === 'pending' || status === 'awaiting_dependency' || status === 'queued') && (
                <PendingSkeleton />
              )}

              {/* Running / streaming / retrying — live indicator */}
              {(status === 'running' || status === 'streaming' || status === 'retrying') && (
                <RunningIndicator data={result?.output_data as Record<string, unknown> | null | undefined} />
              )}

              {/* Skipped — explicit */}
              {status === 'skipped' && (
                <div className="mt-3 rounded-xl border border-surface-border bg-surface-base p-3 text-xs font-medium text-greyscale-500">
                  Skipped (dependency failed or condition unmet)
                </div>
              )}

              {/* Cancelled / timed_out / blocked / invalidated — diagnostic banners */}
              {status === 'cancelled' && (
                <div className="mt-3 rounded-xl border border-status-red/30 bg-status-red/5 p-3 text-xs font-medium text-status-red">
                  Canceled
                </div>
              )}
              {status === 'timed_out' && (
                <div className="mt-3 flex items-center gap-2 rounded-xl border border-status-red/30 bg-status-red/5 p-3 text-xs font-medium text-status-red">
                  <TimerOff size={12} /> Timed out
                </div>
              )}
              {status === 'blocked' && (
                <div className="mt-3 flex items-center gap-2 rounded-xl border border-status-red/30 bg-status-red/5 p-3 text-xs font-medium text-status-red">
                  <AlertTriangle size={12} /> {result?.error_message ?? 'Blocked — unresolved placeholder or missing dependency'}
                </div>
              )}
              {status === 'invalidated' && (
                <div className="mt-3 flex items-center gap-2 rounded-xl border border-status-red/30 bg-status-red/5 p-3 text-xs font-medium text-status-red">
                  <ShieldAlert size={12} /> {result?.error_message ?? 'Output failed contract validation'}
                </div>
              )}

              {/* Completed — rich output renderer */}
              {result?.output_data && status === 'completed' && (
                <OutputRenderer data={result.output_data as Record<string, unknown>} />
              )}

              {/* Failed — error message */}
              {result?.error_message && status === 'failed' && (
                <p className="mt-2 text-xs text-status-red">{result.error_message}</p>
              )}

              {/* Duration metadata — prefer DB column, fall back to legacy output_data.durationMs */}
              {(status === 'completed' || status === 'failed' || status === 'timed_out') && (
                <p className="mt-2 text-[10px] text-greyscale-400">
                  {formatDuration(result)}
                </p>
              )}
            </motion.div>
          )
        })}
    </div>
  )
}

function formatDuration(result: WorkflowNodeResultRecord | undefined): string {
  if (!result) return ''
  const ms =
    result.duration_ms ??
    Number((result.output_data as Record<string, unknown> | null | undefined)?.['durationMs']) ??
    null
  const ttfb = result.ttfb_ms ?? null
  const bits: string[] = []
  if (ms != null && Number.isFinite(ms)) bits.push(`${Math.round(Number(ms))}ms`)
  if (ttfb != null && Number.isFinite(ttfb)) bits.push(`ttfb ${Math.round(Number(ttfb))}ms`)
  return bits.join(' · ')
}
