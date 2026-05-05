import { queryKeys } from '@lenserfight/data/cache'
import { lensesService } from '@lenserfight/data/repositories'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

const PAGE_SIZE = 20

export interface PickableLens {
  id: string
  title: string
  description?: string | null
}

export interface UseAgentLensPickerResult {
  ownLenses: PickableLens[]
  communityLenses: PickableLens[]
  isLoading: boolean
  isFetching: boolean
  hasNextOwnPage: boolean
  fetchNextOwnPage: () => void
  isFetchingNextOwnPage: boolean
  hasNextCommunityPage: boolean
  fetchNextCommunityPage: () => void
  isFetchingNextCommunityPage: boolean
}

function extractItems<T extends { id: string; title: string; description?: string | null }>(
  page: unknown
): T[] {
  if (Array.isArray(page)) return page as T[]
  const env = page as { data?: T[] } | null
  return env?.data ?? []
}

export function useAgentLensPicker(
  enabled: boolean,
  search: string
): UseAgentLensPickerResult {
  const trimmed = search.trim()
  const isSearching = trimmed.length >= 2

  const ownQuery = useInfiniteQuery({
    queryKey: [...queryKeys.lenses.all, 'agent-picker-own'],
    queryFn: ({ pageParam }) =>
      lensesService.getMyLenses(pageParam as number, PAGE_SIZE),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const items = extractItems(lastPage)
      const meta = (lastPage as { meta?: { hasNextPage?: boolean } } | null)?.meta
      const more = meta?.hasNextPage ?? items.length === PAGE_SIZE
      return more ? allPages.length * PAGE_SIZE : undefined
    },
    enabled,
    staleTime: 30_000,
  })

  // Search results are bounded and short-lived — plain query is appropriate here.
  const searchQuery = useQuery({
    queryKey: [...queryKeys.lenses.all, 'agent-picker-search', trimmed],
    queryFn: () => lensesService.search(trimmed, 0, PAGE_SIZE),
    enabled: enabled && isSearching,
    staleTime: 15_000,
  })

  const latestQuery = useInfiniteQuery({
    queryKey: [...queryKeys.lenses.all, 'agent-picker-latest'],
    queryFn: ({ pageParam }) =>
      lensesService.sort('newest', pageParam as number, PAGE_SIZE),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const items = extractItems(lastPage)
      const meta = (lastPage as { meta?: { hasNextPage?: boolean } } | null)?.meta
      const more = meta?.hasNextPage ?? items.length === PAGE_SIZE
      return more ? allPages.length * PAGE_SIZE : undefined
    },
    enabled: enabled && !isSearching,
    staleTime: 60_000,
  })

  const ownLenses = useMemo<PickableLens[]>(() => {
    if (!ownQuery.data) return []
    return ownQuery.data.pages.flatMap((page) =>
      extractItems(page).map((l) => ({ id: l.id, title: l.title, description: l.description }))
    )
  }, [ownQuery.data])

  const ownIds = useMemo(() => new Set(ownLenses.map((l) => l.id)), [ownLenses])

  const communityLenses = useMemo<PickableLens[]>(() => {
    if (isSearching) {
      return extractItems(searchQuery.data)
        .filter((l) => !ownIds.has(l.id))
        .map((l) => ({ id: l.id, title: l.title, description: l.description }))
    }
    if (!latestQuery.data) return []
    return latestQuery.data.pages.flatMap((page) =>
      extractItems(page)
        .filter((l) => !ownIds.has(l.id))
        .map((l) => ({ id: l.id, title: l.title, description: l.description }))
    )
  }, [isSearching, searchQuery.data, latestQuery.data, ownIds])

  return {
    ownLenses,
    communityLenses,
    isLoading:
      ownQuery.isLoading ||
      (isSearching ? searchQuery.isLoading : latestQuery.isLoading),
    isFetching:
      ownQuery.isFetching ||
      (isSearching ? searchQuery.isFetching : latestQuery.isFetching),
    hasNextOwnPage: ownQuery.hasNextPage ?? false,
    fetchNextOwnPage: () => { void ownQuery.fetchNextPage() },
    isFetchingNextOwnPage: ownQuery.isFetchingNextPage,
    hasNextCommunityPage: !isSearching && (latestQuery.hasNextPage ?? false),
    fetchNextCommunityPage: () => { if (!isSearching) void latestQuery.fetchNextPage() },
    isFetchingNextCommunityPage: !isSearching && latestQuery.isFetchingNextPage,
  }
}
