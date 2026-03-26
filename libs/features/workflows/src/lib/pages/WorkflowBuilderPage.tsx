import { Badge, Button, Card } from '@lenserfight/ui/components'
import { workflowsService } from '@lenserfight/data/repositories'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@lenserfight/data/cache'
import { useAuth } from '@lenserfight/features/auth'
import { GitBranch, Play, Swords } from 'lucide-react'
import React, { useState } from 'react'

import { useWorkflow } from '../hooks/useWorkflow'
import { useWorkflowRun } from '../hooks/useWorkflowRun'
import { WorkflowBuilderCanvas } from '../components/WorkflowBuilderCanvas'
import { WorkflowProgressView } from '../components/WorkflowProgressView'

interface WorkflowBuilderPageProps {
  workflowId?: string
  runId?: string
  onWorkflowCreated?: (workflowId: string) => void
  onBattleClick?: (workflowId: string) => void
}

function NewWorkflowForm({ onCreated }: { onCreated: (id: string) => void }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  const { mutateAsync: create, isPending } = useMutation({
    mutationFn: () =>
      workflowsService.createWorkflow({
        lenser_id: user!.id,
        title: title.trim(),
        description: description.trim() || null,
        visibility: 'public',
      }),
    onSuccess: (w) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workflows.byLenser(user!.id) })
      onCreated(w.id)
    },
  })

  return (
    <Card className="mx-auto max-w-xl space-y-5 p-6 mt-12">
      <div className="space-y-1">
        <h2 className="text-xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-50">New Workflow</h2>
        <p className="text-sm text-greyscale-500">Chain lenses into a multi-step pipeline.</p>
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-semibold text-greyscale-900 dark:text-greyscale-50">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Research → Draft → Polish"
          maxLength={120}
          className="w-full rounded-2xl border border-surface-border bg-surface-base px-4 py-3 text-sm text-greyscale-900 outline-none placeholder:text-greyscale-400 focus:border-status-blue dark:bg-surface-raised dark:text-greyscale-50"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-semibold text-greyscale-900 dark:text-greyscale-50">Description (optional)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What does this workflow do?"
          rows={3}
          className="w-full resize-none rounded-2xl border border-surface-border bg-surface-base px-4 py-3 text-sm text-greyscale-900 outline-none placeholder:text-greyscale-400 focus:border-status-blue dark:bg-surface-raised dark:text-greyscale-50"
        />
      </div>
      <Button onClick={() => create()} isLoading={isPending} disabled={title.trim().length < 3} className="w-auto">
        Create Workflow
      </Button>
    </Card>
  )
}

export function WorkflowBuilderPage({ workflowId, runId: _runId, onWorkflowCreated, onBattleClick }: WorkflowBuilderPageProps) {
  const { workflow, nodes, edges, isLoading } = useWorkflow(workflowId)
  const { startRun, isPending: starting, runId, nodeResults, isRunning } = useWorkflowRun(workflowId)
  const [showRun, setShowRun] = useState(false)

  if (!workflowId) {
    return <NewWorkflowForm onCreated={(id) => onWorkflowCreated?.(id)} />
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-greyscale-400">
        Loading workflow…
      </div>
    )
  }

  if (!workflow) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-greyscale-400">
        Workflow not found.
      </div>
    )
  }

  const handleRun = async () => {
    await startRun({})
    setShowRun(true)
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-surface-raised">
          <GitBranch size={18} className="text-greyscale-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-50">{workflow.title}</h1>
          {workflow.description && (
            <p className="text-sm text-greyscale-500 mt-0.5">{workflow.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            size="sm"
            onClick={handleRun}
            isLoading={starting}
            disabled={nodes.length === 0}
            className="gap-2 w-auto"
          >
            <Play size={13} /> Run
          </Button>
          {onBattleClick && (
            <Button
              size="sm"
              onClick={() => onBattleClick(workflow.id)}
              className="gap-2 w-auto"
            >
              <Swords size={13} /> Battle it
            </Button>
          )}
        </div>
      </div>

      {/* Post-save CTA if has nodes */}
      {nodes.length > 0 && !isRunning && !showRun && (
        <div className="rounded-2xl border border-status-blue/30 bg-status-blue/5 px-4 py-3 flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-greyscale-700 dark:text-greyscale-300">
            Your workflow is ready. Battle it now.
          </p>
          {onBattleClick && (
            <button
              type="button"
              onClick={() => onBattleClick(workflow.id)}
              className="text-sm font-semibold text-status-blue hover:underline flex-shrink-0"
            >
              Create battle →
            </button>
          )}
        </div>
      )}

      {/* Builder canvas */}
      <Card className="p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <p className="text-sm font-semibold text-greyscale-900 dark:text-greyscale-50">Workflow nodes</p>
          <Badge color="blue" variant="outline">{nodes.length} lens{nodes.length !== 1 ? 'es' : ''}</Badge>
        </div>
        <WorkflowBuilderCanvas workflowId={workflow.id} nodes={nodes} edges={edges} />
      </Card>

      {/* Run progress */}
      {showRun && runId && (
        <Card className="p-0 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-surface-border">
            <p className="text-sm font-semibold text-greyscale-900 dark:text-greyscale-50">
              Run {isRunning ? '— in progress' : '— complete'}
            </p>
            {isRunning && <Badge color="blue" variant="outline">Running</Badge>}
            {!isRunning && <Badge color="green" variant="outline">Done</Badge>}
          </div>
          <WorkflowProgressView nodes={nodes} edges={edges} nodeResults={nodeResults} />
        </Card>
      )}
    </div>
  )
}
