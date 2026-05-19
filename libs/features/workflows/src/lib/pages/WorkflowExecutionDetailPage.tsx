/**
 * WorkflowExecutionDetailPage — full-screen execution observability view.
 *
 * Route: /workflows/:id/history/executions/:execution_id
 *
 * Responsibilities:
 *   - Restore complete execution state from URL params (deep-link / reload safe).
 *   - Render WorkflowProgressView at full page width with no drawer chrome.
 *   - Support browser back/forward navigation without state loss.
 *   - Provide loading / error / empty states.
 *   - Serve as the foundation for future execution replay / debugging tools.
 *
 * Architecture:
 *   - All data fetching is isolated here; WorkflowProgressView stays presentation-only.
 *   - Uses the same hooks as WorkflowBuilderPage to guarantee data consistency.
 */
import { workflowsService } from '@lenserfight/data/repositories'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, ArrowLeft, GitBranch, History } from 'lucide-react'
import React, { useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { WorkflowProgressView } from '../components/WorkflowProgressView'
import { useWorkflow } from '../hooks/useWorkflow'
import { useWorkflowRunProvenance, useWorkflowRunState } from '../hooks/useWorkflowRunState'

export function WorkflowExecutionDetailPage() {
  const { id: workflowId, execution_id: executionId } = useParams<{
    id: string
    execution_id: string
  }>()
  const navigate = useNavigate()

  // ── Data fetching ────────────────────────────────────────────────────────
  const { workflow, nodes, edges, isLoading: workflowLoading } = useWorkflow(workflowId)

  const { data: nodeResults = [], isLoading: resultsLoading } = useQuery({
    queryKey: ['workflow', workflowId, 'run', executionId, 'nodeResults'],
    queryFn: () => workflowsService.getNodeResults(executionId!),
    enabled: !!executionId,
    staleTime: 1000 * 60,
  })

  const { data: runState } = useWorkflowRunState(executionId ?? null)
  const { data: provenance = [] } = useWorkflowRunProvenance(executionId ?? null)

  // Terminal node: the sink with no outgoing edges, used to highlight the result card.
  const terminalNodeId = useMemo(() => {
    const targetSet = new Set(edges.map((e) => e.target_node_id))
    const sinks = nodes.filter((n) => !targetSet.has(n.id))
    if (sinks.length === 0) return null
    if (sinks.length === 1) return sinks[0]!.id
    return sinks.sort((a, b) => b.ordinal - a.ordinal)[0]?.id ?? null
  }, [nodes, edges])

  const isLoading = workflowLoading || resultsLoading

  // ── Loading state ─────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="space-y-3 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-surface-border border-t-primary-yellow-500" />
          <p className="text-sm text-greyscale-400">Loading execution…</p>
        </div>
      </div>
    )
  }

  // ── Error / not-found states ───────────────────────────────────────────────
  if (!workflow) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <AlertTriangle size={32} className="text-greyscale-300" />
        <p className="text-sm font-medium text-greyscale-500">Workflow not found</p>
        <Link to="/workflows" className="text-xs text-primary-yellow-600 hover:underline">
          Back to workflows
        </Link>
      </div>
    )
  }

  if (!executionId) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <AlertTriangle size={32} className="text-greyscale-300" />
        <p className="text-sm font-medium text-greyscale-500">No execution selected</p>
        <Link
          to={`/workflows/${workflowId}`}
          className="text-xs text-primary-yellow-600 hover:underline"
        >
          Back to workflow
        </Link>
      </div>
    )
  }

  if (nodeResults.length === 0 && !isLoading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <History size={32} className="text-greyscale-300" />
        <p className="text-sm font-medium text-greyscale-500">No execution data found</p>
        <p className="text-xs text-greyscale-400">
          This execution may have been deleted or may not have produced any node results.
        </p>
        <Link
          to={`/workflows/${workflowId}`}
          className="text-xs text-primary-yellow-600 hover:underline"
        >
          Back to workflow
        </Link>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-surface-base">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="flex flex-shrink-0 items-center gap-3 border-b border-surface-border bg-surface-base px-4 h-[56px]">
        <button
          type="button"
          onClick={() => navigate(-1)}
          title="Back"
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl text-greyscale-400 hover:text-greyscale-700 hover:bg-surface-raised transition-colors"
        >
          <ArrowLeft size={16} />
        </button>

        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-surface-raised border border-surface-border shadow-sm">
            <GitBranch size={16} className="text-primary-yellow-600 dark:text-primary-yellow-500" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-bold text-greyscale-900 dark:text-greyscale-50">
              {workflow.title}
            </h1>
            <p className="text-[11px] text-greyscale-400 font-mono truncate">
              Execution&nbsp;
              <span className="text-greyscale-500">{executionId.slice(0, 8)}…</span>
            </p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Link
            to={`/workflows/${workflowId}`}
            className="flex items-center gap-1.5 rounded-xl border border-surface-border bg-surface-raised px-3 py-1.5 text-xs font-medium text-greyscale-500 hover:text-greyscale-900 dark:hover:text-greyscale-50 transition-colors"
          >
            <GitBranch size={12} />
            Open builder
          </Link>
        </div>
      </header>

      {/* ── Execution timeline ───────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl py-6 px-4">
          <WorkflowProgressView
            nodes={nodes}
            edges={edges}
            nodeResults={nodeResults}
            terminalNodeId={terminalNodeId}
            provenance={provenance}
            activeNodeId={runState?.active_node_id ?? null}
            runStartedAt={runState?.started_at ?? null}
            runCompletedAt={runState?.completed_at ?? null}
            runStatus={runState?.status ?? null}
          />
        </div>
      </div>
    </div>
  )
}
