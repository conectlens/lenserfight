import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'

import { queryKeys } from '@lenserfight/data/cache'
import { useToast } from '@lenserfight/shared/error'
import { lenserService, tagFollowsService } from '@lenserfight/data/repositories'
import { lensesService } from '@lenserfight/data/repositories'
import { threadsService } from '@lenserfight/data/repositories'
import type { FollowPeriod, ContentReportDTO, TagFollowRecord } from '@lenserfight/types'

// Re-export for backward compatibility with any imports of `keys` from this file
const keys = queryKeys
export { keys }

export const useThreadsFeed = () => {
  return useInfiniteQuery({
    queryKey: keys.threads.feed(),
    queryFn: async ({ pageParam = 0 }) => {
      return threadsService.getThreadsFeed(undefined, pageParam, 10)
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      if (!lastPage.meta?.hasNextPage) return undefined
      return (lastPage.meta.offset ?? 0) + (lastPage.meta.limit ?? 10)
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  })
}

export const useLensesFeed = (
  searchQuery: string,
  selectedTag: string | null,
  sortOrder: 'newest' | 'popular'
) => {
  return useInfiniteQuery({
    queryKey: keys.lenses.feed({ searchQuery, selectedTag, sortOrder }),
    queryFn: async ({ pageParam = 0 }) => {
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

export const useTopLenses = (enabled = true) => {
  return useQuery({
    queryKey: keys.lenses.top,
    queryFn: () => lensesService.getTopLenses(3),
    staleTime: 1000 * 60 * 10,
    enabled,
  })
}

export const useTrendingTags = (enabled = true) => {
  return useQuery({
    queryKey: keys.tags.trending,
    queryFn: () => threadsService.getTrendingTags(6),
    staleTime: 1000 * 60 * 15,
    enabled,
  })
}

export const useLatestLensers = (enabled = true) => {
  return useQuery({
    queryKey: queryKeys.lenser.latest,
    queryFn: () => lenserService.getLatestJoinedLensers(),
    staleTime: 1000 * 60 * 5,
    enabled,
  })
}

export const useTrendingThreads = (lang?: string) => {
  return useInfiniteQuery({
    queryKey: keys.threads.trending(lang),
    queryFn: async ({ pageParam = 0 }) => {
      return threadsService.getTrendingFeed(lang, pageParam, 20)
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      if (!lastPage.meta?.hasNextPage) return undefined
      return (lastPage.meta.offset ?? 0) + (lastPage.meta.limit ?? 20)
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  })
}

export const useTrendingPrompts = (lang?: string) => {
  return useInfiniteQuery({
    queryKey: keys.lenses.trending(lang),
    queryFn: async ({ pageParam = 0 }) => {
      return lensesService.getTrending(lang, pageParam, 20)
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      if (!lastPage.meta?.hasNextPage) return undefined
      return (lastPage.meta.offset ?? 0) + (lastPage.meta.limit ?? 20)
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
    // Use a distinct idle key when lenserId is absent so this disabled observer
    // never shares a query key with useThreadsFeed. Sharing keys caused React
    // Query v5 to sometimes use the wrong queryFn (returning []) on re-fetches,
    // leaving the trending feed empty and the skeleton visible for anon users.
    queryKey: lenserId ? keys.threads.personal(lenserId) : ['_personal_feed_idle'],
    queryFn: async ({ pageParam = 0 }) => {
      if (!lenserId) return { data: [], meta: { hasNextPage: false, offset: 0, limit: 20 } }
      return threadsService.getPersonalFeed(lenserId, pageParam, 20)
    },
    enabled: Boolean(lenserId),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      if (!lastPage.meta?.hasNextPage) return undefined
      return (lastPage.meta.offset ?? 0) + (lastPage.meta.limit ?? 20)
    },
    staleTime: 1000 * 60 * 3, // 3 minutes — personalized data changes more often
    gcTime: 1000 * 60 * 15,
  })
}

export const usePersonalPrompts = (lenserId?: string, enabled = true) => {
  return useInfiniteQuery({
    queryKey: lenserId ? keys.lenses.personal(lenserId) : keys.lenses.feed(),
    queryFn: async ({ pageParam = 0 }) => {
      if (!lenserId) return { data: [], meta: { hasNextPage: false, offset: 0, limit: 20 } }
      return lensesService.getPersonalFeed(lenserId, pageParam, 20)
    },
    enabled: Boolean(lenserId) && enabled,
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      if (!lastPage.meta?.hasNextPage) return undefined
      return (lastPage.meta.offset ?? 0) + (lastPage.meta.limit ?? 20)
    },
    staleTime: 1000 * 60 * 3,
    gcTime: 1000 * 60 * 15,
  })
}

export const useSuggestedLensers = (lenserId?: string, enabled = true) => {
  return useQuery({
    queryKey: lenserId ? keys.lenser.suggested(lenserId) : keys.lenser.trending,
    queryFn: () => (lenserId ? lenserService.getSuggestedLensers(lenserId, 10) : []),
    enabled: Boolean(lenserId) && enabled,
    staleTime: 1000 * 60 * 10,
  })
}

export const useFollowedTags = (lenserId?: string, enabled = true) => {
  return useQuery({
    queryKey: lenserId ? keys.tags.followed(lenserId) : keys.tags.trending,
    queryFn: () => (lenserId ? tagFollowsService.getFollowedTags(lenserId, 50) : []),
    enabled: Boolean(lenserId) && enabled,
    staleTime: 1000 * 60 * 5,
  })
}

export const useLenserFollows = (lenserId?: string, type: 'followers' | 'following' = 'following') => {
  return useQuery({
    queryKey: lenserId ? keys.lenser.follows(lenserId, type) : keys.lenser.all,
    queryFn: async () => {
      if (!lenserId) return []
      const result = await lenserService.getLenserFollows(lenserId, type)
      return result.data ?? []
    },
    enabled: Boolean(lenserId),
    staleTime: 1000 * 60 * 2,
  })
}

// ── Phase 3: Follow/unfollow mutations ────────────────────────────────────────

export const useFollowLenser = (currentLenserId?: string) => {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { toastError } = useToast()
  return useMutation({
    mutationFn: (followingId: string) => lenserService.followLenser(followingId),
    onSuccess: (_data, followingId) => {
      if (currentLenserId) {
        queryClient.invalidateQueries({ queryKey: keys.lenser.follows(currentLenserId, 'following') })
        queryClient.invalidateQueries({ queryKey: keys.lenser.suggested(currentLenserId) })
        queryClient.invalidateQueries({ queryKey: keys.lenser.follows(followingId, 'followers') })
      }
    },
    onError: (err) => toastError(err, { redirectOnAuth: true, navigate }),
  })
}

export const useUnfollowLenser = (currentLenserId?: string) => {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { toastError } = useToast()
  return useMutation({
    mutationFn: (followingId: string) => lenserService.unfollowLenser(followingId),
    onSuccess: (_data, followingId) => {
      if (currentLenserId) {
        queryClient.invalidateQueries({ queryKey: keys.lenser.follows(currentLenserId, 'following') })
        queryClient.invalidateQueries({ queryKey: keys.lenser.suggested(currentLenserId) })
        queryClient.invalidateQueries({ queryKey: keys.lenser.follows(followingId, 'followers') })
      }
    },
    onError: (err) => toastError(err, { redirectOnAuth: true, navigate }),
  })
}

export const useFollowTag = (lenserId?: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ tagId }: { tagId: string; slug?: string; name?: string }) =>
      tagFollowsService.followTag(tagId),
    onMutate: async ({ tagId, slug, name }) => {
      if (!lenserId || !slug || !name) return
      const cacheKey = keys.tags.followed(lenserId)
      await queryClient.cancelQueries({ queryKey: cacheKey })
      const prev = queryClient.getQueryData<TagFollowRecord[]>(cacheKey)
      queryClient.setQueryData<TagFollowRecord[]>(cacheKey, (old) => [
        ...(old ?? []),
        { tagId, slug, name, followedAt: new Date().toISOString() },
      ])
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (lenserId && ctx?.prev !== undefined)
        queryClient.setQueryData(keys.tags.followed(lenserId), ctx.prev)
    },
  })
}

export const useUnfollowTag = (lenserId?: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (tagId: string) => tagFollowsService.unfollowTag(tagId),
    onMutate: async (tagId) => {
      if (!lenserId) return
      const cacheKey = keys.tags.followed(lenserId)
      await queryClient.cancelQueries({ queryKey: cacheKey })
      const prev = queryClient.getQueryData<TagFollowRecord[]>(cacheKey)
      queryClient.setQueryData<TagFollowRecord[]>(cacheKey, (old) =>
        old?.filter((t) => t.tagId !== tagId) ?? []
      )
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (lenserId && ctx?.prev !== undefined)
        queryClient.setQueryData(keys.tags.followed(lenserId), ctx.prev)
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
