import { Badge, Button } from '@lenserfight/ui/components'
import { workflowsService } from '@lenserfight/data/repositories'
import { useQuery } from '@tanstack/react-query'
import { GitBranch, Play } from 'lucide-react'
import React from 'react'

import { useWorkflowSubmission } from '../../hooks/mutations/useWorkflowSubmission'

interface SubmitWorkflowFormProps {
  battleId: string
  contenderId: string
  workflowId: string
}

export function SubmitWorkflowForm({ battleId, contenderId, workflowId }: SubmitWorkflowFormProps) {
  const { startRun, starting, nodeResults, isRunning, submitted } = useWorkflowSubmission(
    battleId,
    contenderId,
    workflowId
  )

  const { data: workflow } = useQuery({
    queryKey: ['workflow-detail-for-submit', workflowId],
    queryFn: () => workflowsService.getById(workflowId),
    enabled: !!workflowId,
    staleTime: 60_000,
  })

  const { data: nodes = [] } = useQuery({
    queryKey: ['workflow-nodes-for-submit', workflowId],
    queryFn: () => workflowsService.getNodes(workflowId),
    enabled: !!workflowId,
    staleTime: 60_000,
  })

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
        <span className="text-2xl">✅</span>
        <p className="text-sm font-semibold text-greyscale-900 dark:text-greyscale-50">Workflow submitted</p>
        <p className="text-xs text-greyscale-500">Your run results are recorded as your entry.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-1">
      <p className="text-xs font-semibold uppercase tracking-wider text-greyscale-500">Workflow submission</p>

      {/* Workflow card */}
      {workflow && (
        <div className="flex items-center gap-3 rounded-2xl border border-surface-border bg-surface-raised px-4 py-3">
          <GitBranch size={15} className="text-greyscale-400 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-greyscale-900 dark:text-greyscale-50 truncate">{workflow.title}</p>
          </div>
          <Badge color="blue" variant="outline">{nodes.length} lenses</Badge>
        </div>
      )}

      {/* Node progress */}
      {nodeResults.length > 0 && (
        <div className="space-y-2">
          {nodeResults.map((result, i) => (
            <div key={result.id} className="flex items-center gap-2 rounded-xl border border-surface-border bg-surface-base px-3 py-2">
              <span className="text-xs font-bold text-greyscale-400">{i + 1}</span>
              <span className={`text-xs font-semibold capitalize ${
                result.status === 'completed' ? 'text-status-green'
                : result.status === 'failed' ? 'text-status-red'
                : result.status === 'running' ? 'text-status-blue'
                : 'text-greyscale-400'
              }`}>
                {result.status}
              </span>
            </div>
          ))}
        </div>
      )}

      <Button
        size="sm"
        onClick={() => startRun({})}
        isLoading={starting || isRunning}
        disabled={starting || isRunning || nodes.length === 0}
        className="gap-2 w-auto"
      >
        <Play size={13} />
        {isRunning ? 'Running…' : 'Run Workflow'}
      </Button>
    </div>
  )
}
