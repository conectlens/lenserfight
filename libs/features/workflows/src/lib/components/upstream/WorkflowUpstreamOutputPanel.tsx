/**
 * WorkflowUpstreamOutputPanel — shows output schemas and live values from all
 * directly connected upstream nodes for the currently selected node.
 *
 * Placed inside WorkflowNodeConfigPanel (lens nodes) and
 * WorkflowUtilityNodeConfig (utility nodes) after the InputMappingSection.
 *
 * Returns null when there are no upstream connections so callers never need
 * to check before rendering.
 */
import { ChevronDown, ChevronRight } from 'lucide-react'
import React, { useState } from 'react'

import {
  STATUS_COLORS,
  STATUS_LABELS,
  getStatusIcon,
} from '../../execution/workflowNodeExecutionStatus'
import type { UpstreamNodeOutput } from '../../hooks/useUpstreamNodeOutputs'
import { WorkflowOutputFieldTree } from './WorkflowOutputFieldTree'

interface WorkflowUpstreamOutputPanelProps {
  upstreamOutputs: UpstreamNodeOutput[]
  /** Whether a run has ever occurred (controls "live after run" message) */
  hasRun?: boolean
}

export function WorkflowUpstreamOutputPanel({
  upstreamOutputs,
  hasRun = false,
}: WorkflowUpstreamOutputPanelProps) {
  if (upstreamOutputs.length === 0) return null

  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-medium text-greyscale-500 dark:text-greyscale-400">
        Upstream outputs
      </p>
      <div className="space-y-1.5">
        {upstreamOutputs.map((upstream) => (
          <UpstreamNodeSection key={upstream.nodeId} upstream={upstream} hasRun={hasRun} />
        ))}
      </div>
      {/* Expression syntax hint */}
      <p className="text-[10px] text-greyscale-400 dark:text-greyscale-500 px-1">
        Drag a field into any input, or type{' '}
        <code className="font-mono bg-surface-raised px-0.5 rounded">
          [[nodeId.field]]
        </code>{' '}
        to reference it.
      </p>
    </div>
  )
}

// ── Per-upstream-node collapsible section ─────────────────────────────────────

interface UpstreamNodeSectionProps {
  upstream: UpstreamNodeOutput
  hasRun: boolean
}

function UpstreamNodeSection({ upstream, hasRun }: UpstreamNodeSectionProps) {
  const [collapsed, setCollapsed] = useState(false)

  const isTerminalFailure =
    upstream.status === 'failed' ||
    upstream.status === 'timed_out' ||
    upstream.status === 'blocked' ||
    upstream.status === 'invalidated' ||
    upstream.status === 'cancelled'

  const isSkipped = upstream.status === 'skipped'

  const borderClass = upstream.status
    ? (STATUS_COLORS[upstream.status] ?? 'border-surface-border bg-surface-base')
    : 'border-surface-border bg-surface-base'

  return (
    <div
      className={`rounded-lg border text-xs overflow-hidden ${borderClass}`}
    >
      {/* Header */}
      <button
        type="button"
        className="flex w-full items-center gap-1.5 px-2.5 py-1.5 text-left hover:bg-surface-raised/50 transition-colors"
        onClick={() => setCollapsed((c) => !c)}
        aria-expanded={!collapsed}
      >
        {collapsed ? (
          <ChevronRight size={10} className="flex-shrink-0 text-greyscale-400" />
        ) : (
          <ChevronDown size={10} className="flex-shrink-0 text-greyscale-400" />
        )}
        {upstream.status ? (
          <span className="flex-shrink-0">{getStatusIcon(upstream.status, 10)}</span>
        ) : null}
        <span className="font-medium text-greyscale-800 dark:text-greyscale-100 truncate text-[11px]">
          {upstream.label}
        </span>
        {upstream.status && (
          <span className="ml-auto text-[9px] text-greyscale-400 flex-shrink-0">
            {STATUS_LABELS[upstream.status]}
          </span>
        )}
      </button>

      {/* Body */}
      {!collapsed && (
        <div className={`px-2 pb-2 pt-1 ${isSkipped || isTerminalFailure ? 'opacity-60' : ''}`}>
          {isSkipped ? (
            <p className="text-[10px] text-greyscale-400 italic px-2">
              Node was skipped — outputs unavailable.
            </p>
          ) : isTerminalFailure ? (
            <>
              {upstream.error ? (
                <p className="text-[10px] text-status-red px-2 mb-1.5 truncate">
                  {upstream.error}
                </p>
              ) : (
                <p className="text-[10px] text-greyscale-400 italic px-2 mb-1.5">
                  Node did not complete — outputs unavailable.
                </p>
              )}
              {/* Still show schema even on failure for awareness */}
              <WorkflowOutputFieldTree
                nodeId={upstream.nodeId}
                outputSchema={upstream.outputSchema}
                executedValues={null}
                hasRun={hasRun}
              />
            </>
          ) : (
            <WorkflowOutputFieldTree
              nodeId={upstream.nodeId}
              outputSchema={upstream.outputSchema}
              executedValues={upstream.executedValues}
              hasRun={hasRun}
            />
          )}
        </div>
      )}
    </div>
  )
}
