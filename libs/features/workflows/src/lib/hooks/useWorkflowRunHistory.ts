import { workflowsService } from '@lenserfight/data/repositories'
import type { WorkflowRunRecord } from '@lenserfight/data/repositories'
import { useQuery } from '@tanstack/react-query'

export { type WorkflowRunRecord }

/**
 * Fetches the paginated run history for a workflow (owner-only).
 * Stale after 30 seconds since runs update frequently during active execution.
 */
export const useWorkflowRunHistory = (workflowId: string | undefined) =>
  useQuery<WorkflowRunRecord[]>({
    queryKey: ['workflow', workflowId, 'runs'],
    queryFn: () => workflowsService.listRuns(workflowId!, 20),
    enabled: !!workflowId,
    staleTime: 1000 * 30,
  })
