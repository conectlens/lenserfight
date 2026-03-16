import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@lenserfight/data/cache'
import { lenserService, tagFollowsService } from '@lenserfight/data/repositories'
import { promptsService } from '@lenserfight/data/repositories'
import { threadsService } from '@lenserfight/data/repositories'
import type { FollowPeriod, ContentReportDTO } from '@lenserfight/types'

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

// ── Phase 3: Personalized feeds ───────────────────────────────────────────────

export const usePersonalFeed = (lenserId?: string) => {
  return useInfiniteQuery({
    queryKey: lenserId ? keys.threads.personal(lenserId) : keys.threads.feed(),
    queryFn: async ({ pageParam = 0 }) => {
      if (!lenserId) return []
      return threadsService.getPersonalFeed(lenserId, pageParam * 20, 20)
    },
    enabled: Boolean(lenserId),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === 20 ? allPages.length : undefined
    },
    staleTime: 1000 * 60 * 3, // 3 minutes — personalized data changes more often
    gcTime: 1000 * 60 * 15,
  })
}

export const usePersonalPrompts = (lenserId?: string) => {
  return useInfiniteQuery({
    queryKey: lenserId ? keys.prompts.personal(lenserId) : keys.prompts.feed(),
    queryFn: async ({ pageParam = 0 }) => {
      if (!lenserId) return []
      return promptsService.getPersonalFeed(lenserId, pageParam * 20, 20)
    },
    enabled: Boolean(lenserId),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === 20 ? allPages.length : undefined
    },
    staleTime: 1000 * 60 * 3,
    gcTime: 1000 * 60 * 15,
  })
}

export const useSuggestedLensers = (lenserId?: string) => {
  return useQuery({
    queryKey: lenserId ? keys.lenser.suggested(lenserId) : keys.lenser.trending,
    queryFn: () => (lenserId ? lenserService.getSuggestedLensers(lenserId, 10) : []),
    enabled: Boolean(lenserId),
    staleTime: 1000 * 60 * 10,
  })
}

export const useFollowedTags = (lenserId?: string) => {
  return useQuery({
    queryKey: lenserId ? keys.tags.followed(lenserId) : keys.tags.trending,
    queryFn: () => (lenserId ? tagFollowsService.getFollowedTags(lenserId) : []),
    enabled: Boolean(lenserId),
    staleTime: 1000 * 60 * 5,
  })
}

export const useLenserFollows = (lenserId?: string, type: 'followers' | 'following' = 'following') => {
  return useQuery({
    queryKey: lenserId ? keys.lenser.follows(lenserId, type) : keys.lenser.all,
    queryFn: () => (lenserId ? lenserService.getLenserFollows(lenserId, type) : []),
    enabled: Boolean(lenserId),
    staleTime: 1000 * 60 * 2,
  })
}

// ── Phase 3: Follow/unfollow mutations ────────────────────────────────────────

export const useFollowLenser = (currentLenserId?: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (followingId: string) => lenserService.followLenser(followingId),
    onSuccess: (_data, followingId) => {
      if (currentLenserId) {
        queryClient.invalidateQueries({ queryKey: keys.lenser.follows(currentLenserId, 'following') })
        queryClient.invalidateQueries({ queryKey: keys.lenser.suggested(currentLenserId) })
        queryClient.invalidateQueries({ queryKey: keys.lenser.follows(followingId, 'followers') })
      }
    },
  })
}

export const useUnfollowLenser = (currentLenserId?: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (followingId: string) => lenserService.unfollowLenser(followingId),
    onSuccess: (_data, followingId) => {
      if (currentLenserId) {
        queryClient.invalidateQueries({ queryKey: keys.lenser.follows(currentLenserId, 'following') })
        queryClient.invalidateQueries({ queryKey: keys.lenser.suggested(currentLenserId) })
        queryClient.invalidateQueries({ queryKey: keys.lenser.follows(followingId, 'followers') })
      }
    },
  })
}

export const useFollowTag = (lenserId?: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (tagId: string) => tagFollowsService.followTag(tagId),
    onSuccess: () => {
      if (lenserId) {
        queryClient.invalidateQueries({ queryKey: keys.tags.followed(lenserId) })
      }
    },
  })
}

export const useUnfollowTag = (lenserId?: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (tagId: string) => tagFollowsService.unfollowTag(tagId),
    onSuccess: () => {
      if (lenserId) {
        queryClient.invalidateQueries({ queryKey: keys.tags.followed(lenserId) })
      }
    },
  })
}

// ── Phase 4: Leaderboard & content reporting ──────────────────────────────────

export const useLeaderboard = (period: FollowPeriod = 'all_time', limit = 20) => {
  return useQuery({
    queryKey: keys.lenser.leaderboard(period),
    queryFn: () => lenserService.getLeaderboard(period, limit),
    staleTime: 1000 * 60 * 5,
  })
}

export const useReportContent = () => {
  return useMutation({
    mutationFn: (dto: ContentReportDTO) => tagFollowsService.reportContent(dto),
  })
}
