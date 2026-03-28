import { Badge } from '@lenserfight/ui/components'
import { motion } from 'framer-motion'
import { CheckCircle, XCircle, Loader, Clock, ChevronDown } from 'lucide-react'
import React, { useState } from 'react'

import type { WorkflowNodeRecord, WorkflowEdgeRecord, WorkflowNodeResultRecord } from '@lenserfight/data/repositories'

interface WorkflowProgressViewProps {
  nodes: WorkflowNodeRecord[]
  edges: WorkflowEdgeRecord[]
  nodeResults: WorkflowNodeResultRecord[]
}

const STATUS_ICONS = {
  pending: <Clock size={14} className="text-greyscale-400" />,
  running: <Loader size={14} className="text-primary-yellow-600 animate-spin" />,
  completed: <CheckCircle size={14} className="text-status-green" />,
  failed: <XCircle size={14} className="text-status-red" />,
}

const STATUS_COLORS = {
  pending: 'border-surface-border bg-surface-base',
  running: 'border-primary-yellow-500 bg-primary-yellow-500/5',
  completed: 'border-status-green bg-status-green/5',
  failed: 'border-status-red bg-status-red/5',
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
          const status = result?.status ?? 'pending'
          const isRunning = status === 'running'

          return (
            <motion.div
              key={node.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`relative rounded-2xl border p-4 transition-colors ${STATUS_COLORS[status]} ${isRunning ? 'ring-2 ring-primary-yellow-500/30' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-surface-raised text-xs font-bold text-greyscale-500">
                  {node.ordinal + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-greyscale-900 dark:text-greyscale-50 truncate">
                    {node.label || `Node ${node.ordinal + 1}`}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  {STATUS_ICONS[status]}
                  <Badge
                    color={status === 'completed' ? 'green' : status === 'failed' ? 'red' : status === 'running' ? 'blue' : 'gray'}
                    variant="outline"
                  >
                    {status}
                  </Badge>
                </div>
              </div>

              {/* Pending — skeleton loader */}
              {status === 'pending' && <PendingSkeleton />}

              {/* Running — streaming indicator */}
              {status === 'running' && (
                <RunningIndicator data={result?.output_data as Record<string, unknown> | null | undefined} />
              )}

              {/* Completed — rich output renderer */}
              {result?.output_data && status === 'completed' && (
                <OutputRenderer data={result.output_data as Record<string, unknown>} />
              )}

              {/* Failed — error message */}
              {result?.error_message && status === 'failed' && (
                <p className="mt-2 text-xs text-status-red">{result.error_message}</p>
              )}

              {/* Duration metadata */}
              {status === 'completed' && result?.output_data && (result.output_data as Record<string, unknown>)['durationMs'] && (
                <p className="mt-2 text-[10px] text-greyscale-400">
                  {Math.round(Number((result.output_data as Record<string, unknown>)['durationMs']))}ms
                </p>
              )}
            </motion.div>
          )
        })}
    </div>
  )
}
