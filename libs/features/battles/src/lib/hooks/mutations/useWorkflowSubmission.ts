import { workflowsService } from '@lenserfight/data/repositories'
import { supabase } from '@lenserfight/data/supabase'
import type { WorkflowNodeResultRecord } from '@lenserfight/data/repositories'
import { useMutation } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import { useSubmitEntry } from './useSubmitEntry'

/**
 * Starts a workflow run and subscribes to live node result updates.
 * On completion, submits the run ID as the contender entry.
 */
export function useWorkflowSubmission(battleId: string, contenderId: string, workflowId: string | undefined) {
  const [runId, setRunId] = useState<string | null>(null)
  const [nodeResults, setNodeResults] = useState<WorkflowNodeResultRecord[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const submitEntry = useSubmitEntry(battleId)

  const { mutateAsync: startRun, isPending: starting } = useMutation({
    mutationFn: (inputs: Record<string, unknown>) =>
      workflowsService.startRun(workflowId!, inputs),
    onSuccess: (run) => {
      setRunId(run.id)
      setIsRunning(true)
    },
  })

  // Subscribe to node result updates
  useEffect(() => {
    if (!runId) return

    workflowsService.getNodeResults(runId).then(setNodeResults)

    const channel = supabase
      .channel(`battle-workflow-run-${runId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'lenses',
          table: 'workflow_node_results',
          filter: `run_id=eq.${runId}`,
        },
        (payload) => {
          const updated = payload.new as WorkflowNodeResultRecord
          setNodeResults((prev) => {
            const idx = prev.findIndex((r) => r.id === updated.id)
            return idx === -1 ? [...prev, updated] : prev.map((r, i) => (i === idx ? updated : r))
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [runId])

  // Detect completion and auto-submit
  useEffect(() => {
    if (!runId || !isRunning || nodeResults.length === 0) return
    const allDone = nodeResults.every((r) => r.status === 'completed' || r.status === 'failed')
    if (allDone) {
      setIsRunning(false)
      // Submit the run ID as the entry
      submitEntry.mutate({ contenderId, contentText: `workflow_run:${runId}` })
    }
  }, [nodeResults, isRunning, runId, contenderId, submitEntry])

  return { startRun, starting, runId, nodeResults, isRunning, submitted: submitEntry.isSuccess }
}
