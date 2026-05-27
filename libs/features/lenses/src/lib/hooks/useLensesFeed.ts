import { useInfiniteQuery } from '@tanstack/react-query'

import { queryKeys } from '@lenserfight/data/cache'
import { lensesService } from '@lenserfight/data/repositories'

export const useLensesFeed = (
  searchQuery: string,
  selectedTag: string | null,
  sortOrder: 'newest' | 'popular' | 'mine'
) => {
  return useInfiniteQuery({
    queryKey: queryKeys.lenses.feed({ searchQuery, selectedTag, sortOrder }),
    queryFn: async ({ pageParam = 0 }) => {
      if (sortOrder === 'mine') return lensesService.getMyLenses(pageParam, 12)
      if (searchQuery) return lensesService.search(searchQuery, pageParam, 12)
      if (selectedTag) return lensesService.filter(selectedTag, pageParam, 12, sortOrder)
      return lensesService.sort(sortOrder, pageParam, 12)
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      if (!lastPage.meta?.hasNextPage) return undefined
      return (lastPage.meta.offset ?? 0) + (lastPage.meta.limit ?? 12)
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  })
}
