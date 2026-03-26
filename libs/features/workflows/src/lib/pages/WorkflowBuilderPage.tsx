import { Badge, Button } from '@lenserfight/ui/components'
import { ArrowLeft, ChevronDown, GitBranch, Play, Swords, X } from 'lucide-react'
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { WorkflowBuilderCanvas } from '../components/WorkflowBuilderCanvas'
import { WorkflowLensPalette } from '../components/WorkflowLensPalette'
import { WorkflowProgressView } from '../components/WorkflowProgressView'
import { useWorkflow } from '../hooks/useWorkflow'
import { useWorkflowRun } from '../hooks/useWorkflowRun'

interface WorkflowBuilderPageProps {
  workflowId: string
  runId?: string
  onBattleClick?: (workflowId: string) => void
}

export function WorkflowBuilderPage({ workflowId, onBattleClick }: WorkflowBuilderPageProps) {
  const navigate = useNavigate()
  const { workflow, nodes, edges, isLoading } = useWorkflow(workflowId)
  const { startRun, isPending: starting, runId, nodeResults, isRunning } = useWorkflowRun(workflowId)
  const [showRunPanel, setShowRunPanel] = useState(false)
  const [paletteCollapsed, setPaletteCollapsed] = useState(false)

  const handleRun = async () => {
    await startRun({})
    setShowRunPanel(true)
  }

  // ── Loading / error states ─────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-greyscale-400">
        Loading workflow…
      </div>
    )
  }

  if (!workflow) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-greyscale-400">
        Workflow not found.
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-surface-base">
      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <header className="flex flex-shrink-0 items-center gap-3 border-b border-surface-border bg-surface-base px-4 h-[52px]">
        {/* Back */}
        <button
          type="button"
          onClick={() => navigate('/workflows')}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl text-greyscale-400 hover:text-greyscale-700 hover:bg-surface-raised transition-colors dark:hover:text-greyscale-200"
          title="Back to workflows"
        >
          <ArrowLeft size={16} />
        </button>

        {/* Workflow identity */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-surface-raised">
            <GitBranch size={14} className="text-greyscale-400" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-bold text-greyscale-900 dark:text-greyscale-50">
              {workflow.title}
            </h1>
            {workflow.description && (
              <p className="truncate text-xs text-greyscale-400 leading-none mt-0.5">
                {workflow.description}
              </p>
            )}
          </div>
          <Badge color="blue" variant="outline" className="flex-shrink-0 text-xs">
            {nodes.length} node{nodes.length !== 1 ? 's' : ''}
          </Badge>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Run */}
          <Button
            size="sm"
            onClick={handleRun}
            isLoading={starting}
            disabled={nodes.length === 0}
            className="gap-1.5 w-auto"
          >
            <Play size={12} /> Run
          </Button>

          {/* Battle */}
          {onBattleClick && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onBattleClick(workflow.id)}
              className="gap-1.5 w-auto"
            >
              <Swords size={12} /> Battle it
            </Button>
          )}

          {/* Run panel toggle */}
          {runId && (
            <button
              type="button"
              onClick={() => setShowRunPanel((v) => !v)}
              className="flex items-center gap-1 rounded-xl border border-surface-border bg-surface-raised px-2.5 py-1 text-xs font-medium text-greyscale-600 hover:text-greyscale-900 transition-colors dark:text-greyscale-300"
            >
              {isRunning ? (
                <Badge color="blue" variant="outline" className="text-[10px]">Running</Badge>
              ) : (
                <Badge color="green" variant="outline" className="text-[10px]">Done</Badge>
              )}
              <ChevronDown size={12} className={`transition-transform ${showRunPanel ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
      </header>

      {/* ── Main area ──────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Lens palette sidebar */}
        <WorkflowLensPalette
          onDragStart={() => undefined}
          collapsed={paletteCollapsed}
          onToggleCollapse={() => setPaletteCollapsed((v) => !v)}
        />

        {/* Canvas — fills remaining space */}
        <div className="relative flex-1 overflow-hidden">
          <WorkflowBuilderCanvas
            workflowId={workflow.id}
            nodes={nodes}
            edges={edges}
          />

          {/* Empty state overlay */}
          {nodes.length === 0 && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="text-center space-y-2 opacity-40">
                <GitBranch size={40} className="mx-auto text-greyscale-300" />
                <p className="text-sm font-medium text-greyscale-400">
                  Drag a lens from the left panel to start building
                </p>
              </div>
            </div>
          )}

          {/* Battle CTA — shown when workflow has nodes and isn't running */}
          {nodes.length > 0 && !isRunning && !showRunPanel && onBattleClick && (
            <div className="pointer-events-auto absolute top-3 right-3 flex items-center gap-2 rounded-2xl border border-status-blue/30 bg-status-blue/5 px-3 py-2 shadow-sm">
              <p className="text-xs font-medium text-greyscale-700 dark:text-greyscale-300">
                Workflow ready.
              </p>
              <button
                type="button"
                onClick={() => onBattleClick(workflow.id)}
                className="text-xs font-semibold text-status-blue hover:underline"
              >
                Battle it →
              </button>
            </div>
          )}
        </div>

        {/* Run results panel — slides in from the right */}
        {showRunPanel && runId && (
          <aside className="flex flex-col w-80 flex-shrink-0 border-l border-surface-border bg-surface-base overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-surface-border">
              <p className="text-xs font-semibold text-greyscale-900 dark:text-greyscale-50">
                Run {isRunning ? '— in progress' : '— complete'}
              </p>
              <button
                type="button"
                onClick={() => setShowRunPanel(false)}
                className="text-greyscale-400 hover:text-greyscale-700 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <WorkflowProgressView nodes={nodes} edges={edges} nodeResults={nodeResults} />
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}
