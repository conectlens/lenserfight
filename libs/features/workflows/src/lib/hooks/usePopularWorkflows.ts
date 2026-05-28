import { queryKeys } from '@lenserfight/data/cache'
import { workflowsService } from '@lenserfight/data/repositories'
import { useInfiniteQuery } from '@tanstack/react-query'

const PAGE_SIZE = 12

export function usePopularWorkflows(filter: { search?: string } = {}, enabled = true) {
  return useInfiniteQuery({
    queryKey: queryKeys.workflows.popular(filter),
    queryFn: ({ pageParam = 0 }) =>
      workflowsService.getPopular(pageParam as number, PAGE_SIZE, filter.search),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      if (!lastPage.meta?.hasNextPage) return undefined
      return (lastPage.meta.offset ?? 0) + PAGE_SIZE
    },
    enabled,
    staleTime: 1000 * 60,
  })
}
