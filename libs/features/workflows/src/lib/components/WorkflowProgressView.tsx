import { Badge, StreamingOutput } from '@lenserfight/ui/components'
import { getErrorCopy } from '../utils/workflowErrorMessages'
import {
  isActiveNodeStatus,
  isTerminalNodeStatus,
  isWaitingNodeStatus,
  type WorkflowRunProvenanceEdge,
} from '@lenserfight/types'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCircle,
  ChevronDown,
  GitBranch,
  Hourglass,
  PauseCircle,
  ShieldAlert,
  Sparkles,
  TimerOff,
  Workflow,
  XCircle,
  Zap,
} from 'lucide-react'
import React, { useMemo, useState } from 'react'

import {
  getStatusIcon,
  STATUS_COLORS,
  STATUS_LABELS,
} from '../execution/workflowNodeExecutionStatus'

import type {
  WorkflowNodeRecord,
  WorkflowEdgeRecord,
  WorkflowNodeResultRecord,
} from '@lenserfight/data/repositories'
import { WorkflowOutputActions } from './WorkflowOutputActions'

interface WorkflowProgressViewProps {
  nodes: WorkflowNodeRecord[]
  edges: WorkflowEdgeRecord[]
  nodeResults: WorkflowNodeResultRecord[]
  /** ID of the terminal node (no outgoing edges). Highlighted as the workflow result. */
  terminalNodeId?: string | null
  /** Called when the user clicks "Post to thread" on a node's output. */
  onPostToThread?: (text: string, nodeLabel: string) => void
  /** Called when the user clicks "Use as context" to re-run with this output injected. */
  onRerunWithContext?: (data: Record<string, unknown>) => void
  /**
   * N8N-style — when provided, the inspector renders the cross-workflow
   * provenance tabs ("Data came from" / "Data used by"). Optional so callers
   * that just need the timeline (e.g. historical run replay) can omit it.
   */
  provenance?: WorkflowRunProvenanceEdge[]
  /**
   * Optional explicit active node id from the run-state projection. When
   * present, takes priority over status-derived activity so the run strip
   * always shows the engine's authoritative active step.
   */
  activeNodeId?: string | null
  /** Run start timestamp; drives the elapsed-time pill. */
  runStartedAt?: string | null
  /** Run terminal timestamp; freezes the elapsed clock when present. */
  runCompletedAt?: string | null
  /** Run status; controls the run-strip badge colour and label. */
  runStatus?: string | null
}

type NodeStatus = WorkflowNodeResultRecord['status']

const WAITING_REASON_LABELS: Record<string, string> = {
  dependency: 'Waiting for upstream node',
  condition_false: 'Condition not met',
  rate_limit: 'Provider rate limit',
  retry_backoff: 'Retry backoff',
  human_input: 'Awaiting human input',
  external_callback: 'Awaiting external callback',
  queued: 'Queued for next wave',
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

function runBadgeColor(status: string | null | undefined): 'green' | 'red' | 'blue' | 'yellow' | 'gray' {
  if (!status) return 'gray'
  switch (status) {
    case 'completed':
      return 'green'
    case 'failed':
    case 'cancelled':
    case 'timed_out':
      return 'red'
    case 'running':
    case 'streaming':
      return 'blue'
    case 'queued':
    case 'pending':
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

  if ((mediaType === 'audio' || mimeType?.startsWith('audio/')) && url) {
    return (
      <div className="mt-3">
        <audio src={url} controls className="w-full" preload="metadata" />
      </div>
    )
  }

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

// ── Run-strip header ─────────────────────────────────────────────────────────

function RunStrip({
  status,
  startedAt,
  completedAt,
  active,
  waiting,
  executed,
  failed,
}: {
  status: string | null | undefined
  startedAt: string | null | undefined
  completedAt: string | null | undefined
  active: number
  waiting: number
  executed: number
  failed: number
}) {
  const elapsed = useElapsed(startedAt, completedAt)
  const label = status ? status.replace(/_/g, ' ') : '—'
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-surface-border bg-surface-base px-3 py-2 text-xs">
      <Badge color={runBadgeColor(status)} variant="solid">
        <span className="capitalize">{label}</span>
      </Badge>
      <span className="text-greyscale-400 font-mono tabular-nums">{elapsed}</span>
      <span className="ml-auto flex items-center gap-3 text-greyscale-500">
        <span className="inline-flex items-center gap-1">
          <Zap size={11} className="text-primary-yellow-600" />
          {active} active
        </span>
        <span className="inline-flex items-center gap-1">
          <Hourglass size={11} className="text-greyscale-400" />
          {waiting} waiting
        </span>
        <span className="inline-flex items-center gap-1">
          <CheckCircle size={11} className="text-status-green" />
          {executed} done
        </span>
        {failed > 0 && (
          <span className="inline-flex items-center gap-1">
            <XCircle size={11} className="text-status-red" />
            {failed} failed
          </span>
        )}
      </span>
    </div>
  )
}

function useElapsed(startedAt: string | null | undefined, completedAt: string | null | undefined): string {
  const [now, setNow] = React.useState(() => Date.now())
  React.useEffect(() => {
    if (completedAt) return
    if (!startedAt) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [startedAt, completedAt])

  if (!startedAt) return '00:00'
  const startMs = new Date(startedAt).getTime()
  const endMs = completedAt ? new Date(completedAt).getTime() : now
  const diffSec = Math.max(0, Math.floor((endMs - startMs) / 1000))
  const m = Math.floor(diffSec / 60)
  const s = diffSec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// ── Provenance panel ────────────────────────────────────────────────────────

function ProvenancePanel({
  edges,
  selectedNodeId,
  nodeLabelById,
}: {
  edges: WorkflowRunProvenanceEdge[]
  selectedNodeId: string | null
  nodeLabelById: Map<string, string>
}) {
  const filtered = selectedNodeId
    ? edges.filter(
        (e) => e.target_node_id === selectedNodeId || e.source_node_id === selectedNodeId,
      )
    : edges
  const upstream = filtered.filter((e) => e.direction === 'upstream')
  const downstream = filtered.filter((e) => e.direction === 'downstream')

  if (filtered.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-surface-border p-4 text-xs text-greyscale-400">
        <div className="flex items-center gap-2">
          <GitBranch size={12} />
          {selectedNodeId
            ? 'No data lineage recorded for the selected node yet.'
            : 'No cross-workflow data lineage recorded yet for this run.'}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <ProvenanceColumn
        title="Data came from"
        icon={<ArrowDownToLine size={12} className="text-blue-400" />}
        edges={upstream}
        nodeLabelById={nodeLabelById}
        side="source"
      />
      <ProvenanceColumn
        title="Data used by"
        icon={<ArrowUpFromLine size={12} className="text-purple-400" />}
        edges={downstream}
        nodeLabelById={nodeLabelById}
        side="target"
      />
    </div>
  )
}

function ProvenanceColumn({
  title,
  icon,
  edges,
  nodeLabelById,
  side,
}: {
  title: string
  icon: React.ReactNode
  edges: WorkflowRunProvenanceEdge[]
  nodeLabelById: Map<string, string>
  side: 'source' | 'target'
}) {
  if (edges.length === 0) {
    return (
      <div className="rounded-xl border border-surface-border bg-surface-base p-3">
        <div className="flex items-center gap-2 text-[11px] font-semibold text-greyscale-500">
          {icon}
          <span>{title}</span>
        </div>
        <p className="mt-1 text-[10px] text-greyscale-400">No edges</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-surface-border bg-surface-base p-3">
      <div className="flex items-center gap-2 text-[11px] font-semibold text-greyscale-500">
        {icon}
        <span>{title}</span>
        <span className="ml-auto text-[10px] text-greyscale-400">{edges.length}</span>
      </div>
      <ul className="mt-2 space-y-2">
        {edges.map((edge) => {
          const otherNodeId = side === 'source' ? edge.source_node_id : edge.target_node_id
          const otherPath = side === 'source' ? edge.source_output_path : edge.target_input_path
          const localPath = side === 'source' ? edge.target_input_path : edge.source_output_path
          const otherLabel = nodeLabelById.get(otherNodeId) ?? `Node ${otherNodeId.slice(0, 6)}…`
          const otherWorkflowId = side === 'source' ? edge.source_workflow_id : edge.target_workflow_id
          const localWorkflowId = side === 'source' ? edge.target_workflow_id : edge.source_workflow_id
          const crossWorkflow = otherWorkflowId !== localWorkflowId
          return (
            <li
              key={edge.id}
              className="rounded-lg border border-surface-border/60 bg-surface-raised/40 p-2 text-[11px]"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-greyscale-700 dark:text-greyscale-300 truncate">
                  {otherLabel}
                </span>
                {crossWorkflow && (
                  <Badge color="purple" variant="outline">
                    cross-workflow
                  </Badge>
                )}
              </div>
              <div className="mt-1 font-mono text-[10px] text-greyscale-500 break-all">
                {side === 'source' ? (
                  <>
                    <span className="text-blue-400">{otherPath}</span>
                    <span className="mx-1 text-greyscale-400">→</span>
                    <span className="text-greyscale-400">{localPath}</span>
                  </>
                ) : (
                  <>
                    <span className="text-greyscale-400">{localPath}</span>
                    <span className="mx-1 text-greyscale-400">→</span>
                    <span className="text-purple-400">{otherPath}</span>
                  </>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// ── Main inspector ──────────────────────────────────────────────────────────

export function WorkflowProgressView({
  nodes,
  nodeResults,
  terminalNodeId,
  onPostToThread,
  onRerunWithContext,
  provenance,
  activeNodeId,
  runStartedAt,
  runCompletedAt,
  runStatus,
}: WorkflowProgressViewProps) {
  const resultIndex = useMemo(() => new Map(nodeResults.map((r) => [r.node_id, r])), [nodeResults])
  const getResult = (nodeId: string) => resultIndex.get(nodeId)

  const orderedNodes = useMemo(
    () => nodes.slice().sort((a, b) => a.ordinal - b.ordinal),
    [nodes],
  )

  const nodeLabelById = useMemo(() => {
    const map = new Map<string, string>()
    nodes.forEach((n, i) => map.set(n.id, n.label || `Node ${i + 1}`))
    return map
  }, [nodes])

  const counts = useMemo(() => {
    let active = 0
    let waiting = 0
    let executed = 0
    let failed = 0
    for (const node of orderedNodes) {
      const status = (getResult(node.id)?.status ?? 'pending') as NodeStatus
      if (isActiveNodeStatus(status)) active++
      else if (isWaitingNodeStatus(status) || status === 'pending') waiting++
      else if (status === 'completed' || status === 'skipped') executed++
      else if (
        status === 'failed' ||
        status === 'cancelled' ||
        status === 'timed_out' ||
        status === 'blocked' ||
        status === 'invalidated'
      )
        failed++
    }
    return { active, waiting, executed, failed }
  }, [orderedNodes, resultIndex])

  const derivedActiveNodeId = useMemo(() => {
    if (activeNodeId) return activeNodeId
    const active = orderedNodes.find((n) =>
      isActiveNodeStatus(getResult(n.id)?.status ?? 'pending'),
    )
    return active?.id ?? null
  }, [activeNodeId, orderedNodes, resultIndex])

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [showProvenance, setShowProvenance] = useState(false)

  const provenanceEdges = provenance ?? []

  // Derive run status / timestamps from nodeResults when callers don't pass them.
  const fallbackRunStatus = useMemo<string>(() => {
    if (counts.active > 0) return 'running'
    if (counts.failed > 0 && counts.waiting === 0 && counts.active === 0) return 'failed'
    if (counts.executed === orderedNodes.length && orderedNodes.length > 0) return 'completed'
    return 'pending'
  }, [counts, orderedNodes.length])
  const effectiveStatus = runStatus ?? fallbackRunStatus
  const fallbackStarted = useMemo(
    () => orderedNodes.map((n) => getResult(n.id)?.started_at).filter(Boolean).sort()[0] ?? null,
    [orderedNodes, resultIndex],
  )
  const fallbackCompleted = useMemo(() => {
    if (counts.active > 0 || counts.waiting > 0) return null
    return (
      orderedNodes
        .map((n) => getResult(n.id)?.completed_at)
        .filter(Boolean)
        .sort()
        .reverse()[0] ?? null
    )
  }, [counts, orderedNodes, resultIndex])

  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-sm text-greyscale-400">
        No nodes in this workflow.
      </div>
    )
  }

  return (
    <div className="space-y-3 p-3">
      <RunStrip
        status={effectiveStatus}
        startedAt={runStartedAt ?? fallbackStarted}
        completedAt={runCompletedAt ?? fallbackCompleted}
        active={counts.active}
        waiting={counts.waiting}
        executed={counts.executed}
        failed={counts.failed}
      />

      <div className="flex items-center gap-2 text-[10px] font-semibold text-greyscale-500 uppercase tracking-wide">
        <Workflow size={11} /> Execution timeline
        <button
          type="button"
          onClick={() => setShowProvenance((v) => !v)}
          className={`ml-auto inline-flex items-center gap-1 rounded-full border border-surface-border px-2 py-0.5 text-[10px] font-medium normal-case tracking-normal transition-colors ${
            showProvenance ? 'bg-primary-yellow-500/10 text-primary-yellow-600 border-primary-yellow-500/40' : 'text-greyscale-400 hover:text-greyscale-600'
          }`}
        >
          <GitBranch size={10} /> Lineage
          {provenanceEdges.length > 0 && (
            <span className="ml-1 inline-block rounded-full bg-greyscale-100 dark:bg-greyscale-800 px-1.5 text-[9px] font-bold text-greyscale-600">
              {provenanceEdges.length}
            </span>
          )}
        </button>
      </div>

      {showProvenance && (
        <ProvenancePanel
          edges={provenanceEdges}
          selectedNodeId={selectedNodeId}
          nodeLabelById={nodeLabelById}
        />
      )}

      <div className="space-y-3">
        {orderedNodes.map((node) => {
          const result = getResult(node.id)
          const status: NodeStatus = result?.status ?? 'pending'
          const isActive = node.id === derivedActiveNodeId || isActiveNodeStatus(status)
          const isWaiting = isWaitingNodeStatus(status)
          const isTerminal = node.id === terminalNodeId
          const isSelected = selectedNodeId === node.id
          const displayStatus = STATUS_LABELS[status]
          const waitingReason = result?.waiting_reason ?? null
          const waitingLabel =
            waitingReason && WAITING_REASON_LABELS[waitingReason]
              ? WAITING_REASON_LABELS[waitingReason]
              : waitingReason
                ? `Waiting · ${waitingReason.replace(/_/g, ' ')}`
                : null

          return (
            <motion.div
              key={node.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setSelectedNodeId(node.id === selectedNodeId ? null : node.id)}
              className={`relative cursor-pointer rounded-2xl border p-4 transition-all ${STATUS_COLORS[status]} ${
                isActive ? 'ring-2 ring-primary-yellow-500/40 shadow-lg shadow-primary-yellow-500/10' : ''
              } ${isTerminal && status === 'completed' ? 'ring-2 ring-primary-yellow-500/50 border-primary-yellow-500/40' : ''} ${
                isSelected ? 'outline outline-2 outline-offset-2 outline-greyscale-400/30' : ''
              }`}
            >
              {isTerminal && status === 'completed' && (
                <div className="flex items-center gap-1 mb-2">
                  <Sparkles size={11} className="text-primary-yellow-500" />
                  <span className="text-[10px] font-semibold text-primary-yellow-600 dark:text-primary-yellow-400 uppercase tracking-wide">
                    Workflow Result
                  </span>
                </div>
              )}

              <div className="flex items-center gap-3">
                <div
                  className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-colors ${
                    isActive
                      ? 'bg-primary-yellow-500 text-greyscale-900'
                      : isTerminalNodeStatus(status) && status === 'completed'
                        ? 'bg-status-green/20 text-status-green'
                        : 'bg-surface-raised text-greyscale-500'
                  }`}
                >
                  {node.ordinal + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-greyscale-900 dark:text-greyscale-50 truncate">
                    {node.label || `Node ${node.ordinal + 1}`}
                  </p>
                  {(result?.retry_count ?? 0) > 0 && (
                    <p className="text-[10px] text-greyscale-400 mt-0.5">
                      {result!.retry_count} retr{result!.retry_count === 1 ? 'y' : 'ies'}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  {getStatusIcon(status)}
                  <Badge color={badgeColorFor(status)} variant="outline">
                    {displayStatus}
                  </Badge>
                </div>
              </div>

              {isWaiting && waitingLabel && (
                <div className="mt-3 flex items-center gap-2 rounded-xl border border-surface-border bg-surface-base p-2 text-[11px] font-medium text-greyscale-500">
                  <PauseCircle size={11} /> {waitingLabel}
                </div>
              )}

              {(status === 'pending' || (isWaiting && !waitingLabel)) && <PendingSkeleton />}

              {(status === 'running' || status === 'streaming' || status === 'retrying') && (
                <div className="mt-3">
                  <StreamingOutput
                    state="streaming"
                    output={((result?.output_data as Record<string, unknown> | null | undefined)?.['output'] ?? (result?.output_data as Record<string, unknown> | null | undefined)?.['text'] ?? '') as string}
                  />
                </div>
              )}

              {status === 'skipped' && (
                <div className="mt-3 rounded-xl border border-surface-border bg-surface-base p-3 text-xs font-medium text-greyscale-500">
                  Skipped (dependency failed or condition unmet)
                </div>
              )}

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

              {result?.output_data && status === 'completed' && (
                <>
                  <OutputRenderer data={result.output_data as Record<string, unknown>} />
                  <WorkflowOutputActions
                    outputData={result.output_data as Record<string, unknown>}
                    nodeLabel={node.label || `Node ${node.ordinal + 1}`}
                    onPostToThread={onPostToThread ? (text) => onPostToThread(text, node.label || `Node ${node.ordinal + 1}`) : undefined}
                    onRerunWithContext={onRerunWithContext}
                  />
                </>
              )}

              {result?.error_message && status === 'failed' && (
                <p className="mt-2 text-xs text-status-red">{getErrorCopy(result.error_message)}</p>
              )}

              {(status === 'completed' || status === 'failed' || status === 'timed_out') && (
                <p className="mt-2 text-[10px] text-greyscale-400">{formatDuration(result)}</p>
              )}
            </motion.div>
          )
        })}
      </div>
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
