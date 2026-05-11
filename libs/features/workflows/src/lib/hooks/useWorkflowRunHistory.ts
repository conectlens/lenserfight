import { workflowsService } from '@lenserfight/data/repositories'
import type { WorkflowRunRecord } from '@lenserfight/data/repositories'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

export { type WorkflowRunRecord }

const PAGE_SIZE = 10

export function useWorkflowRunHistory(
  workflowId: string | undefined,
  options?: { enabled?: boolean },
) {
  const enabled = (options?.enabled ?? true) && !!workflowId
  const query = useInfiniteQuery<WorkflowRunRecord[]>({
    queryKey: ['workflow', workflowId, 'runs'],
    queryFn: ({ pageParam }) =>
      workflowsService.listRuns(workflowId!, PAGE_SIZE, (pageParam as number) ?? 0),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === PAGE_SIZE ? allPages.flat().length : undefined,
    enabled,
    staleTime: 1000 * 30,
  })

  const runs = useMemo(() => query.data?.pages.flat() ?? [], [query.data])

  return { ...query, runs }
}
