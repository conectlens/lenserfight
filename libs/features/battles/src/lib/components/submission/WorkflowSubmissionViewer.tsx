import { workflowsService } from '@lenserfight/data/repositories'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle, Loader, XCircle, Clock } from 'lucide-react'
import React from 'react'

import type { SubmissionRendererProps } from '../../types/battle-renderer.types'

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Clock size={13} className="text-greyscale-400" />,
  running: <Loader size={13} className="text-status-blue animate-spin" />,
  completed: <CheckCircle size={13} className="text-status-green" />,
  failed: <XCircle size={13} className="text-status-red" />,
}

export const WorkflowSubmissionViewer: React.FC<SubmissionRendererProps> = ({ content }) => {
  // content format: "workflow_run:<runId>" or plain runId
  const runId = content?.startsWith('workflow_run:') ? content.slice('workflow_run:'.length) : content ?? null

  const { data: nodeResults = [], isLoading } = useQuery({
    queryKey: ['workflow-node-results-viewer', runId],
    queryFn: () => workflowsService.getNodeResults(runId!),
    enabled: !!runId,
    staleTime: 60_000,
  })

  if (!runId) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-greyscale-500">
        No workflow run submitted yet.
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader size={16} className="animate-spin text-greyscale-400" />
      </div>
    )
  }

  return (
    <div className="space-y-2 p-2">
      {nodeResults
        .slice()
        .sort((a, b) => (a.id < b.id ? -1 : 1))
        .map((result, i) => (
          <div key={result.id} className="rounded-xl border border-surface-border bg-surface-raised p-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-greyscale-400">{i + 1}</span>
              {STATUS_ICONS[result.status] ?? null}
              <span className="text-xs font-semibold text-greyscale-700 dark:text-greyscale-300 capitalize">{result.status}</span>
            </div>
            {result.output_data && result.status === 'completed' && (
              <p className="mt-2 text-xs text-greyscale-600 dark:text-greyscale-400 font-mono break-all line-clamp-3">
                {typeof result.output_data['output'] === 'string'
                  ? String(result.output_data['output']).slice(0, 180)
                  : JSON.stringify(result.output_data).slice(0, 180)}
              </p>
            )}
          </div>
        ))}
    </div>
  )
}
