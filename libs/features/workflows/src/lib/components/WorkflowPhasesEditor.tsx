import type { WorkflowPhaseRecord, WorkflowTaskRecord } from '@lenserfight/types'
import { HelpButton } from '@lenserfight/ui/components'
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
import React, { useRef, useState } from 'react'
import {
  useDeletePhase,
  useDeleteTask,
  useReorderPhases,
  useUpsertPhase,
  useUpsertTask,
  useWorkflowPhases,
  useWorkflowTasksByWorkflow,
} from '../hooks/useWorkflowPhases'
import { WorkflowTaskCard } from './WorkflowTaskCard'

interface WorkflowPhasesEditorProps {
  workflowId: string
  isOwner: boolean
}

export function WorkflowPhasesEditor({ workflowId, isOwner }: WorkflowPhasesEditorProps) {
  const { data: phases = [], isLoading: phasesLoading } = useWorkflowPhases(workflowId)
  const { data: allTasks = [], isLoading: tasksLoading } = useWorkflowTasksByWorkflow(workflowId)

  const { mutate: upsertPhase } = useUpsertPhase(workflowId)
  const { mutate: deletePhase } = useDeletePhase(workflowId)
  const { mutate: reorderPhases } = useReorderPhases(workflowId)
  const { mutate: upsertTask } = useUpsertTask(workflowId)

  const isLoading = phasesLoading || tasksLoading

  const tasksByPhase = (phaseId: string): WorkflowTaskRecord[] =>
    allTasks.filter((t) => t.phase_id === phaseId).sort((a, b) => a.ordinal - b.ordinal)

  const addPhase = () => {
    upsertPhase({
      workflow_id: workflowId,
      title: `Phase ${phases.length + 1}`,
      ordinal: phases.length,
    })
  }

  const movePhase = (index: number, direction: -1 | 1) => {
    const ordered = [...phases].sort((a, b) => a.ordinal - b.ordinal)
    const target = index + direction
    if (target < 0 || target >= ordered.length) return
    const ids = ordered.map((p) => p.id)
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    reorderPhases(ids)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-greyscale-400 py-16">
        Loading phases…
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 max-w-2xl mx-auto w-full py-6 px-4">
      <div className="flex items-center justify-end">
        <HelpButton
          path="/explanation/workflows/workflow-phases"
          label="About Phases"
        />
      </div>

      {phases.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center text-greyscale-400">
          <p className="text-sm font-medium mb-1">No phases yet.</p>
          {isOwner && (
            <p className="text-xs">
              Add a phase to start building your structured workflow.
            </p>
          )}
        </div>
      ) : (
        phases
          .slice()
          .sort((a, b) => a.ordinal - b.ordinal)
          .map((phase, phaseIdx, sorted) => (
            <PhaseCard
              key={phase.id}
              phase={phase}
              tasks={tasksByPhase(phase.id)}
              isOwner={isOwner}
              workflowId={workflowId}
              onMoveUp={phaseIdx > 0 ? () => movePhase(phaseIdx, -1) : undefined}
              onMoveDown={phaseIdx < sorted.length - 1 ? () => movePhase(phaseIdx, 1) : undefined}
              onDelete={() => deletePhase(phase.id)}
              onUpdatePhase={(patch) => upsertPhase({ ...phase, ...patch })}
              onUpsertTask={(task) => upsertTask(task)}
            />
          ))
      )}

      {isOwner && (
        <button
          type="button"
          onClick={addPhase}
          className="flex items-center gap-2 justify-center w-full rounded-xl border border-dashed border-surface-border py-3 text-sm font-medium text-greyscale-400 hover:text-greyscale-700 dark:hover:text-greyscale-200 hover:border-greyscale-400 transition-colors"
        >
          <Plus size={14} /> Add Phase
        </button>
      )}
    </div>
  )
}

// ─── PhaseCard ────────────────────────────────────────────────────────────────

interface PhaseCardProps {
  phase: WorkflowPhaseRecord
  tasks: WorkflowTaskRecord[]
  isOwner: boolean
  workflowId: string
  onMoveUp?: () => void
  onMoveDown?: () => void
  onDelete: () => void
  onUpdatePhase: (patch: Partial<WorkflowPhaseRecord>) => void
  onUpsertTask: (task: Partial<WorkflowTaskRecord> & { phase_id: string; workflow_id: string }) => void
}

function PhaseCard({
  phase,
  tasks,
  isOwner,
  workflowId,
  onMoveUp,
  onMoveDown,
  onDelete,
  onUpdatePhase,
  onUpsertTask,
}: PhaseCardProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [title, setTitle] = useState(phase.title)
  const titleRef = useRef<HTMLInputElement>(null)

  const { mutate: deleteTask } = useDeleteTask(workflowId, phase.id)
  const { mutate: upsertTask } = useUpsertTask(workflowId)

  const commitTitle = () => {
    if (title.trim() && title !== phase.title) onUpdatePhase({ title: title.trim() })
  }

  const addTask = () => {
    onUpsertTask({
      phase_id: phase.id,
      workflow_id: workflowId,
      title: `Task ${tasks.length + 1}`,
      output_type: 'text',
      ordinal: tasks.length,
    })
  }

  const moveTask = (index: number, direction: -1 | 1) => {
    const sorted = [...tasks].sort((a, b) => a.ordinal - b.ordinal)
    const target = index + direction
    if (target < 0 || target >= sorted.length) return
    sorted[index] = { ...sorted[index], ordinal: target }
    sorted[target] = { ...sorted[target], ordinal: index }
    sorted.forEach((t) => upsertTask({ ...t, phase_id: phase.id, workflow_id: workflowId }))
  }

  return (
    <div className="rounded-xl border border-surface-border bg-surface-raised overflow-hidden">
      {/* Phase header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-surface-base border-b border-surface-border">
        {/* Move phase */}
        {isOwner && (
          <div className="flex flex-col gap-0.5 flex-shrink-0">
            <button
              type="button"
              onClick={onMoveUp}
              disabled={!onMoveUp}
              className="p-0.5 rounded text-greyscale-400 hover:text-greyscale-700 disabled:opacity-25 transition-colors"
            >
              <ChevronUp size={13} />
            </button>
            <button
              type="button"
              onClick={onMoveDown}
              disabled={!onMoveDown}
              className="p-0.5 rounded text-greyscale-400 hover:text-greyscale-700 disabled:opacity-25 transition-colors"
            >
              <ChevronDown size={13} />
            </button>
          </div>
        )}

        {/* Phase number badge */}
        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-yellow-500/20 text-primary-yellow-700 dark:text-primary-yellow-400 text-xs font-bold flex items-center justify-center">
          {phase.ordinal + 1}
        </span>

        {/* Title */}
        {isOwner ? (
          <input
            ref={titleRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => e.key === 'Enter' && titleRef.current?.blur()}
            className="flex-1 min-w-0 bg-transparent text-sm font-semibold text-greyscale-900 dark:text-greyscale-50 placeholder-greyscale-400 focus:outline-none focus:ring-1 focus:ring-primary/50 rounded px-1 -mx-1"
            placeholder="Phase title…"
          />
        ) : (
          <span className="flex-1 min-w-0 text-sm font-semibold text-greyscale-900 dark:text-greyscale-50 truncate">
            {phase.title}
          </span>
        )}

        {/* Task count */}
        <span className="text-xs text-greyscale-400 flex-shrink-0">
          {tasks.length} task{tasks.length !== 1 ? 's' : ''}
        </span>

        {/* Collapse */}
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="flex-shrink-0 p-1 rounded text-greyscale-400 hover:text-greyscale-700 transition-colors"
        >
          {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </button>

        {/* Delete phase */}
        {isOwner && (
          <button
            type="button"
            onClick={onDelete}
            className="flex-shrink-0 p-1 rounded text-greyscale-300 hover:text-status-red transition-colors"
            title="Delete phase"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {/* Task list */}
      {!collapsed && (
        <div className="p-3 space-y-2">
          {tasks.length === 0 && !isOwner && (
            <p className="text-xs text-greyscale-400 text-center py-4">No tasks in this phase.</p>
          )}

          {tasks
            .slice()
            .sort((a, b) => a.ordinal - b.ordinal)
            .map((task, taskIdx, sorted) => (
              <WorkflowTaskCard
                key={task.id}
                task={task}
                isOwner={isOwner}
                onUpdate={(patch) =>
                  upsertTask({ ...task, ...patch, phase_id: phase.id, workflow_id: workflowId })
                }
                onDelete={() => deleteTask(task.id)}
                onMoveUp={taskIdx > 0 ? () => moveTask(taskIdx, -1) : undefined}
                onMoveDown={taskIdx < sorted.length - 1 ? () => moveTask(taskIdx, 1) : undefined}
              />
            ))}

          {isOwner && (
            <button
              type="button"
              onClick={addTask}
              className="flex items-center gap-1.5 w-full justify-center rounded-lg border border-dashed border-surface-border py-2 text-xs font-medium text-greyscale-400 hover:text-greyscale-700 dark:hover:text-greyscale-200 hover:border-greyscale-400 transition-colors"
            >
              <Plus size={12} /> Add Task
            </button>
          )}
        </div>
      )}
    </div>
  )
}
