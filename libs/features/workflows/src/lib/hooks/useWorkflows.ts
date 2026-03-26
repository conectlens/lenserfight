import { queryKeys } from '@lenserfight/data/cache'
import { workflowsService, type WorkflowsListFilter } from '@lenserfight/data/repositories'
import { useInfiniteQuery } from '@tanstack/react-query'

const PAGE_SIZE = 12

export function useWorkflows(lenserId: string | undefined, filter: WorkflowsListFilter = {}) {
  return useInfiniteQuery({
    queryKey: queryKeys.workflows.feed(lenserId ?? '', filter),
    queryFn: ({ pageParam = 0 }) =>
      workflowsService.listByLenserPaginated(lenserId!, pageParam as number, PAGE_SIZE, filter),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      if (!lastPage.meta?.hasNextPage) return undefined
      return (lastPage.meta.offset ?? 0) + PAGE_SIZE
    },
    enabled: !!lenserId,
    staleTime: 1000 * 60,
  })
}
