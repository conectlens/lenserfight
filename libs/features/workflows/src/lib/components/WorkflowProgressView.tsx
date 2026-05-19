import { Badge, Button, HelpButton, StreamingOutput, Tooltip } from '@lenserfight/ui/components'
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
  Settings2,
  ArrowUpFromLine,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Copy,
  GitBranch,
  Hourglass,
  Maximize2,
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
import { adaptExecutionOutput } from '../execution/executionOutputAdapter'
import { computeDagOrder } from '../utils/workflowDagTraversal'

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
  /**
   * When provided, a fullscreen icon is shown in the timeline header.
   * Clicking it calls this callback — the parent supplies the navigate action.
   */
  onOpenFullscreen?: () => void
  /**
   * When provided, a "Configure node" button is shown on blocked/errored cards.
   * Called with the node id and its lens_id (or '__utility' for utility nodes).
   */
  onConfigureNode?: (nodeId: string, lensId: string) => void
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

// ── Execution output renderer (strategy-based via adaptExecutionOutput) ───────

const MAX_TEXT_CHARS = 1200
const MAX_JSON_CHARS = 600

/** Copy text to clipboard with a brief visual confirmation. */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }
  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Copy to clipboard"
      aria-label="Copy to clipboard"
      className="flex items-center gap-1 rounded-md border border-surface-border px-1.5 py-0.5 text-[10px] font-medium text-greyscale-400 hover:text-greyscale-700 dark:hover:text-greyscale-200 hover:bg-surface-raised transition-colors"
    >
      <Copy size={9} />
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

/** Collapsible section wrapper used for Metadata, Raw JSON, etc. */
function CollapsibleSection({
  label,
  defaultOpen = false,
  children,
  action,
}: {
  label: string
  defaultOpen?: boolean
  children: React.ReactNode
  action?: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-xl border border-surface-border/60 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-greyscale-500 hover:bg-surface-raised/60 transition-colors"
      >
        {open ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
        <span className="flex-1 text-left">{label}</span>
        {action && <span onClick={(e) => e.stopPropagation()}>{action}</span>}
      </button>
      {open && <div className="border-t border-surface-border/60">{children}</div>}
    </div>
  )
}

/**
 * Rich execution output renderer.
 * Uses the ExecutionOutputViewModel from adaptExecutionOutput — never touches
 * raw payload shapes directly, keeping this component closed to backend changes.
 */
function ExecutionOutputRenderer({ data }: { data: Record<string, unknown> }) {
  const vm = useMemo(() => adaptExecutionOutput(data), [data])
  const [textExpanded, setTextExpanded] = useState(false)
  const rawJson = useMemo(() => JSON.stringify(vm.rawPayload, null, 2), [vm.rawPayload])

  // ── Image ──────────────────────────────────────────────────────────────────
  if (vm.type === 'image' && vm.url) {
    return (
      <div className="mt-3 space-y-2">
        <img
          src={vm.url}
          alt="Node output"
          className="w-full rounded-xl border border-surface-border object-contain max-h-64"
          loading="lazy"
        />
        <div className="flex items-center justify-end">
          <a
            href={vm.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-greyscale-400 hover:text-greyscale-600 underline"
          >
            Open full size
          </a>
        </div>
      </div>
    )
  }

  // ── Video ──────────────────────────────────────────────────────────────────
  if (vm.type === 'video' && vm.url) {
    return (
      <div className="mt-3">
        <video
          src={vm.url}
          controls
          className="w-full rounded-xl border border-surface-border max-h-64"
          preload="metadata"
        />
      </div>
    )
  }

  // ── Audio ──────────────────────────────────────────────────────────────────
  if (vm.type === 'audio' && vm.url) {
    return (
      <div className="mt-3">
        <audio src={vm.url} controls className="w-full" preload="metadata" />
      </div>
    )
  }

  // ── LLM response ──────────────────────────────────────────────────────────
  if ((vm.type === 'llm_response' || vm.type === 'text' || vm.type === 'markdown') && vm.text) {
    const isLong = vm.text.length > MAX_TEXT_CHARS
    const displayText = textExpanded || !isLong ? vm.text : vm.text.slice(0, MAX_TEXT_CHARS) + '…'
    return (
      <div className="mt-3 space-y-2">
        {/* Summary pill */}
        <p className="text-[10px] text-greyscale-400 font-medium">{vm.summary}</p>

        {/* Text body */}
        <div className="rounded-xl bg-surface-base p-3 text-xs text-greyscale-700 dark:text-greyscale-300 font-mono whitespace-pre-wrap break-words leading-relaxed">
          {displayText}
        </div>
        {isLong && (
          <button
            type="button"
            onClick={() => setTextExpanded((v) => !v)}
            className="flex items-center gap-1 text-[10px] font-medium text-greyscale-400 hover:text-greyscale-600 transition-colors"
          >
            <ChevronDown size={10} className={`transition-transform ${textExpanded ? 'rotate-180' : ''}`} />
            {textExpanded ? 'Collapse' : `Show all ${vm.text.length.toLocaleString()} chars`}
          </button>
        )}

        {/* LLM metadata — model, tokens, provider */}
        {vm.metadata && Object.keys(vm.metadata).length > 0 && (
          <CollapsibleSection label="Metadata">
            <div className="flex flex-wrap gap-2 px-3 py-2">
              {Object.entries(vm.metadata).map(([k, v]) => (
                <span
                  key={k}
                  className="inline-flex items-center gap-1 rounded-full bg-surface-raised border border-surface-border px-2 py-0.5 text-[10px] text-greyscale-600 dark:text-greyscale-400"
                >
                  <span className="font-semibold text-greyscale-500">{k}:</span>
                  {String(v)}
                </span>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Raw JSON — always available for advanced users */}
        <CollapsibleSection
          label="Raw JSON"
          action={<CopyButton text={rawJson} />}
        >
          <div className="p-3 text-[10px] font-mono text-greyscale-600 dark:text-greyscale-400 whitespace-pre-wrap break-words leading-relaxed max-h-48 overflow-y-auto">
            {rawJson.length > MAX_JSON_CHARS ? rawJson.slice(0, MAX_JSON_CHARS) + '\n…' : rawJson}
          </div>
        </CollapsibleSection>
      </div>
    )
  }

  // ── Array / table ─────────────────────────────────────────────────────────
  if (vm.type === 'array' || vm.type === 'table') {
    const items = (vm.rawPayload['items'] ?? vm.rawPayload['rows'] ?? vm.rawPayload['results']) as unknown[]
    return (
      <div className="mt-3 space-y-2">
        <p className="text-[10px] text-greyscale-400 font-medium">{vm.summary}</p>
        <CollapsibleSection label="Items" defaultOpen={items.length <= 5}>
          <div className="divide-y divide-surface-border/60 max-h-56 overflow-y-auto">
            {items.slice(0, 50).map((item, i) => (
              <div key={i} className="px-3 py-1.5 text-[11px] font-mono text-greyscale-700 dark:text-greyscale-300 truncate">
                {typeof item === 'object' ? JSON.stringify(item) : String(item)}
              </div>
            ))}
            {items.length > 50 && (
              <div className="px-3 py-1.5 text-[10px] text-greyscale-400">
                …and {items.length - 50} more items
              </div>
            )}
          </div>
        </CollapsibleSection>
        <CollapsibleSection label="Raw JSON" action={<CopyButton text={rawJson} />}>
          <div className="p-3 text-[10px] font-mono text-greyscale-600 dark:text-greyscale-400 whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
            {rawJson.length > MAX_JSON_CHARS ? rawJson.slice(0, MAX_JSON_CHARS) + '\n…' : rawJson}
          </div>
        </CollapsibleSection>
      </div>
    )
  }

  // ── Generic JSON (catch-all) ───────────────────────────────────────────────
  const isLongJson = rawJson.length > MAX_JSON_CHARS
  const displayJson = textExpanded || !isLongJson ? rawJson : rawJson.slice(0, MAX_JSON_CHARS) + '…'
  return (
    <div className="mt-3 space-y-2">
      <p className="text-[10px] text-greyscale-400 font-medium">{vm.summary}</p>
      <div className="flex items-center justify-end">
        <CopyButton text={rawJson} />
      </div>
      <div className="rounded-xl bg-surface-base p-3 text-xs text-greyscale-600 dark:text-greyscale-400 font-mono whitespace-pre-wrap break-words leading-relaxed max-h-64 overflow-y-auto">
        {displayJson}
      </div>
      {isLongJson && (
        <button
          type="button"
          onClick={() => setTextExpanded((v) => !v)}
          className="flex items-center gap-1 text-[10px] font-medium text-greyscale-400 hover:text-greyscale-600 transition-colors"
        >
          <ChevronDown size={10} className={`transition-transform ${textExpanded ? 'rotate-180' : ''}`} />
          {textExpanded ? 'Collapse' : 'Show full output'}
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
  edges,
  nodeResults,
  terminalNodeId,
  onPostToThread,
  onRerunWithContext,
  provenance,
  activeNodeId,
  runStartedAt,
  runCompletedAt,
  runStatus,
  onOpenFullscreen,
  onConfigureNode,
}: WorkflowProgressViewProps) {
  const resultIndex = useMemo(() => new Map(nodeResults.map((r) => [r.node_id, r])), [nodeResults])
  const getResult = (nodeId: string) => resultIndex.get(nodeId)

  // DAG-aware ordering: starts from trigger/root nodes and follows the actual
  // execution graph instead of relying on the DB insertion ordinal.
  const orderedNodes = useMemo(
    () => computeDagOrder(nodes, edges),
    [nodes, edges],
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
        <Tooltip content="Each card shows one workflow node — its live status, output, and any errors. Ordered by DAG execution flow." position="right">
          <span className="inline-flex items-center gap-1.5 cursor-default">
            <Workflow size={11} /> Execution timeline
          </span>
        </Tooltip>
        <HelpButton path="/tutorials/getting-started/local-file-storage" label="How workflows run" className="normal-case tracking-normal ml-1" />

        {/* Fullscreen deep-link — only rendered when a run is active/selected */}
        {onOpenFullscreen && (
          <Tooltip content="Open full execution view" position="top">
            <button
              type="button"
              onClick={onOpenFullscreen}
              aria-label="Open execution details in full view"
              className="inline-flex items-center justify-center rounded-md border border-surface-border p-1 text-greyscale-400 hover:text-greyscale-700 dark:hover:text-greyscale-200 hover:bg-surface-raised transition-colors normal-case tracking-normal"
            >
              <Maximize2 size={10} />
            </button>
          </Tooltip>
        )}

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
                  <AlertTriangle size={12} />
                  <span className="flex-1">{getErrorCopy(result?.error_message) || 'Blocked — unresolved placeholder or missing dependency'}</span>
                  {onConfigureNode && (node.lens_id || node.id) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        onConfigureNode(node.id, node.lens_id ?? '__utility')
                      }}
                      className="shrink-0 flex items-center gap-1 !h-6 !px-2 !rounded-lg !text-[10px] font-semibold border border-status-red/40 text-status-red hover:border-status-red hover:bg-status-red/10"
                    >
                      <Settings2 size={10} />
                      Configure node
                    </Button>
                  )}
                  {result?.error_message === 'placeholder_unbound' && (
                    <Tooltip
                      content={
                        <span className="max-w-[220px] block">
                          A <code className="font-mono">{'[[variable]]'}</code> in this node&apos;s template has no value. Set a static value in the node config, wire it from an upstream node&apos;s output, or supply it as a workflow input.
                        </span>
                      }
                      position="left"
                      contentClassName=""
                    >
                      <HelpButton path="/tutorials/walkthroughs/create-a-workflow" label="Fix this" className="shrink-0 border-status-red/40 text-status-red hover:border-status-red hover:text-status-red" />
                    </Tooltip>
                  )}
                </div>
              )}
              {status === 'invalidated' && (
                <div className="mt-3 flex items-center gap-2 rounded-xl border border-status-red/30 bg-status-red/5 p-3 text-xs font-medium text-status-red">
                  <ShieldAlert size={12} /> {result?.error_message ?? 'Output failed contract validation'}
                </div>
              )}

              {result?.output_data && status === 'completed' && (
                <>
                  <ExecutionOutputRenderer data={result.output_data as Record<string, unknown>} />
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
