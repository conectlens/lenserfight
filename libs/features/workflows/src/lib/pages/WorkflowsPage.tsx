import { Button } from '@lenserfight/ui/components'
import { useAuth } from '@lenserfight/features/auth'
import { GitBranch, Plus } from 'lucide-react'
import React from 'react'
import { Outlet } from 'react-router-dom'

import { useWorkflow } from '../hooks/useWorkflow'
import { useWorkflows } from '../hooks/useWorkflows'
import { WorkflowCard } from '../components/WorkflowCard'

// Per-card node count loader — avoids over-fetching all nodes upfront
function WorkflowCardWithNodes({ workflowId, onOpen }: { workflowId: string; onOpen: () => void }) {
  const { workflow, nodes } = useWorkflow(workflowId)
  if (!workflow) return null
  return <WorkflowCard workflow={workflow} nodes={nodes} onClick={onOpen} />
}

interface WorkflowsPageProps {
  onCreateWorkflow: () => void
  onOpenWorkflow: (workflowId: string) => void
}

export function WorkflowsPage({ onCreateWorkflow, onOpenWorkflow }: WorkflowsPageProps) {
  const { user } = useAuth()
  const { data: workflows = [], isLoading } = useWorkflows(user?.id)

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-50">
            Connected Lenses
          </h1>
          <p className="mt-1 text-sm text-greyscale-500">
            Chain lenses into multi-step workflows and battle them end-to-end.
          </p>
        </div>
        <Button onClick={onCreateWorkflow} className="gap-2 w-auto flex-shrink-0">
          <Plus size={15} /> New Workflow
        </Button>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 rounded-2xl border border-surface-border bg-surface-raised animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && workflows.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-surface-border py-16 px-8 text-center space-y-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-raised">
            <GitBranch size={24} className="text-greyscale-400" />
          </div>
          <div>
            <p className="font-semibold text-greyscale-900 dark:text-greyscale-50">Build your first Connected Lens workflow</p>
            <p className="mt-1 text-sm text-greyscale-500">
              Chain lenses together and watch AI outputs transform step by step.
            </p>
          </div>
          <Button onClick={onCreateWorkflow} className="gap-2 w-auto">
            <Plus size={15} /> Create Workflow
          </Button>
        </div>
      )}

      {!isLoading && workflows.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {workflows.map((w) => (
            <WorkflowCardWithNodes
              key={w.id}
              workflowId={w.id}
              onOpen={() => onOpenWorkflow(w.id)}
            />
          ))}
        </div>
      )}

      {/* Nested modal outlet — renders /workflows/manage modal overlay */}
      <Outlet />
    </div>
  )
}
