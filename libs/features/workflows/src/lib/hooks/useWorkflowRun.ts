import { queryKeys } from '@lenserfight/data/cache'
import { workflowsService } from '@lenserfight/data/repositories'
import { supabase } from '@lenserfight/data/supabase'
import type { WorkflowNodeResultRecord } from '@lenserfight/data/repositories'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

export function useWorkflowRun(workflowId: string | undefined) {
  const queryClient = useQueryClient()
  const [runId, setRunId] = useState<string | null>(null)
  const [nodeResults, setNodeResults] = useState<WorkflowNodeResultRecord[]>([])
  const [isRunning, setIsRunning] = useState(false)

  const { mutateAsync: startRun, isPending } = useMutation({
    mutationFn: ({ inputs, globalModelId }: { inputs: Record<string, unknown>; globalModelId?: string }) =>
      workflowsService.startRun(workflowId!, inputs, globalModelId),
    onSuccess: (run) => {
      setRunId(run.id)
      setIsRunning(true)
      queryClient.invalidateQueries({ queryKey: queryKeys.workflows.run(run.id) })
    },
  })

  // Realtime subscription for node results
  useEffect(() => {
    if (!runId) return

    // Load initial node results
    workflowsService.getNodeResults(runId).then(setNodeResults)

    const channel = supabase
      .channel(`workflow-run-${runId}`)
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
            if (idx === -1) return [...prev, updated]
            const next = [...prev]
            next[idx] = updated
            return next
          })
          // Check if all nodes are terminal
          setNodeResults((current) => {
            const allDone = current.every(
              (r) => r.status === 'completed' || r.status === 'failed'
            )
            if (allDone) setIsRunning(false)
            return current
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [runId])

  return {
    startRun,
    isPending,
    runId,
    nodeResults,
    isRunning,
  }
}
