import { useQuery, useInfiniteQuery } from '@tanstack/react-query'

import { queryKeys } from '@lenserfight/data/cache'
import { lenserService } from '@lenserfight/data/repositories'
import { promptsService } from '@lenserfight/data/repositories'
import { threadsService } from '@lenserfight/data/repositories'

// Re-export for backward compatibility with any imports of `keys` from this file
const keys = queryKeys
export { keys }

export const useThreadsFeed = () => {
  return useInfiniteQuery({
    queryKey: keys.threads.feed(),
    queryFn: async ({ pageParam = 0 }) => {
      return threadsService.getThreadsFeed(undefined, pageParam * 10, 10)
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === 10 ? allPages.length : undefined
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  })
}

export const usePromptsFeed = (
  searchQuery: string,
  selectedTag: string | null,
  sortOrder: 'newest' | 'popular'
) => {
  return useInfiniteQuery({
    queryKey: keys.prompts.feed({ searchQuery, selectedTag, sortOrder }),
    queryFn: async ({ pageParam = 0 }) => {
      const offset = pageParam * 12
      const limit = 12

      if (searchQuery) return promptsService.search(searchQuery, offset, limit)
      if (selectedTag) return promptsService.filter(selectedTag, offset, limit)
      if (sortOrder) return promptsService.sort(sortOrder, offset, limit)

      return promptsService.getPrompts(offset, limit)
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === 12 ? allPages.length : undefined
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  })
}

export const useTopPrompts = () => {
  return useQuery({
    queryKey: keys.prompts.top,
    queryFn: () => promptsService.getTopPrompts(3),
    staleTime: 1000 * 60 * 10,
  })
}

export const useTrendingTags = () => {
  return useQuery({
    queryKey: keys.tags.trending,
    queryFn: () => threadsService.getTrendingTags(6),
    staleTime: 1000 * 60 * 15,
  })
}

export const useLatestLensers = () => {
  return useQuery({
    queryKey: queryKeys.lenser.latest,
    queryFn: () => lenserService.getLatestJoinedLensers(),
    staleTime: 1000 * 60 * 5,
  })
}

export const useTrendingThreads = (lang?: string) => {
  return useInfiniteQuery({
    queryKey: keys.threads.trending(lang),
    queryFn: async ({ pageParam = 0 }) => {
      return threadsService.getTrendingFeed(lang, pageParam * 20, 20)
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === 20 ? allPages.length : undefined
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  })
}

export const useTrendingPrompts = (lang?: string) => {
  return useInfiniteQuery({
    queryKey: keys.prompts.trending(lang),
    queryFn: async ({ pageParam = 0 }) => {
      return promptsService.getTrending(lang, pageParam * 20, 20)
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === 20 ? allPages.length : undefined
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  })
}

export const useTrendingLensers = () => {
  return useQuery({
    queryKey: keys.lenser.trending,
    queryFn: () => lenserService.getTrendingLensers(10),
    staleTime: 1000 * 60 * 10,
  })
}
