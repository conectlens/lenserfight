import { Clock3, GitBranch, Lock } from 'lucide-react'
import React from 'react'

import type { WorkflowRecord } from '@lenserfight/data/repositories'
import type { WorkflowScheduleRecord } from '@lenserfight/types'

interface AILenserWorkflowPanelProps {
  workflows: WorkflowRecord[]
  schedules: WorkflowScheduleRecord[]
  onOpenWorkflow: (workflowId: string) => void
}

export const AILenserWorkflowPanel: React.FC<AILenserWorkflowPanelProps> = ({
  workflows,
  schedules,
  onOpenWorkflow,
}) => {
  const scheduleCountByWorkflow = schedules.reduce<Record<string, number>>((acc, schedule) => {
    acc[schedule.workflow_id] = (acc[schedule.workflow_id] ?? 0) + 1
    return acc
  }, {})

  const activeScheduleCountByWorkflow = schedules
    .filter((s) => s.is_active)
    .reduce<Record<string, number>>((acc, schedule) => {
      acc[schedule.workflow_id] = (acc[schedule.workflow_id] ?? 0) + 1
      return acc
    }, {})

  if (workflows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
        This AI workspace does not own any workflows yet.
      </div>
    )
  }

  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {workflows.map((workflow) => (
        <div key={workflow.id} className="space-y-3">
          <button
            onClick={() => onOpenWorkflow(workflow.id)}
            className="w-full rounded-2xl border border-gray-200 bg-white p-5 text-left transition-colors hover:border-primary-yellow-500 dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="mb-3 flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-700/70">
                <GitBranch size={16} className="text-gray-500 dark:text-gray-300" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-semibold text-gray-900 dark:text-white">{workflow.title}</p>
                  {workflow.visibility === 'private' && (
                    <Lock size={12} className="text-gray-400" />
                  )}
                </div>
                {workflow.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">
                    {workflow.description}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>{workflow.node_count ?? 0} lenses</span>
              <span>{workflow.visibility}</span>
            </div>
          </button>

          <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-800">
            <span className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-300">
              <Clock3 size={14} />
              {activeScheduleCountByWorkflow[workflow.id] ?? 0} of {scheduleCountByWorkflow[workflow.id] ?? 0} schedule{scheduleCountByWorkflow[workflow.id] === 1 ? '' : 's'} active
            </span>
            <span className="inline-flex items-center gap-2 text-gray-500 dark:text-gray-400">
              <GitBranch size={14} />
              {workflow.node_count ?? 0} lenses
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
