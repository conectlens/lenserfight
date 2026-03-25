import { tagService } from '@lenserfight/data/repositories'
import { useLenser } from '@lenserfight/features/profile'
import { TaggedContentItem, SortOption } from '@lenserfight/types'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { PromptTagProvider } from '../providers/PromptTagProvider'
import { ThreadTagProvider } from '../providers/ThreadTagProvider'

const promptProvider = new PromptTagProvider()
const threadProvider = new ThreadTagProvider()

const PAGE_SIZE = 20

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'threads', label: 'Threads' },
  { value: 'lenses', label: 'Lenses' },
]

export const useTagDetailController = (slug?: string) => {
  const { lenser } = useLenser()
  const navigate = useNavigate()

  // URL State
  const { tab: routeTab } = useParams<{ tab?: string; slug: string }>()
  const [searchParams, setSearchParams] = useSearchParams()

  const activeTab = routeTab && ['threads', 'lenses'].includes(routeTab) ? routeTab : 'all'
  const sortType = (searchParams.get('type') as SortOption) || 'trending'

  // 1. Fetch Tag Metadata
  const { data: tag, isLoading: loadingTag } = useQuery({
    queryKey: ['tag', slug],
    queryFn: () => (slug ? tagService.getTagDetails(slug) : null),
    enabled: !!slug,
    staleTime: 1000 * 60 * 10, // 10 minutes
  })

  // 2. Fetch Content (Split queries for independent caching + pagination)
  const shouldFetchPrompts = activeTab === 'all' || activeTab === 'lenses'
  const shouldFetchThreads = activeTab === 'all' || activeTab === 'threads'

  const {
    data: promptPages,
    isLoading: loadingPrompts,
    fetchNextPage: fetchNextPrompts,
    hasNextPage: hasMorePrompts,
  } = useInfiniteQuery({
    queryKey: ['tag-prompts', slug, sortType],
    queryFn: ({ pageParam = 0 }) =>
      slug
        ? promptProvider.listByTag(slug, sortType, lenser?.id, pageParam as number, PAGE_SIZE)
        : Promise.resolve([]),
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      (lastPage as TaggedContentItem[]).length >= PAGE_SIZE
        ? (lastPageParam as number) + PAGE_SIZE
        : undefined,
    enabled: !!slug && shouldFetchPrompts,
    staleTime: 1000 * 60 * 5,
  })

  const {
    data: threadPages,
    isLoading: loadingThreads,
    fetchNextPage: fetchNextThreads,
    hasNextPage: hasMoreThreads,
  } = useInfiniteQuery({
    queryKey: ['tag-threads', slug, sortType],
    queryFn: ({ pageParam = 0 }) =>
      slug
        ? threadProvider.listByTag(slug, sortType, lenser?.id, pageParam as number, PAGE_SIZE)
        : Promise.resolve([]),
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      (lastPage as TaggedContentItem[]).length >= PAGE_SIZE
        ? (lastPageParam as number) + PAGE_SIZE
        : undefined,
    enabled: !!slug && shouldFetchThreads,
    staleTime: 1000 * 60 * 5,
  })

  // Flatten pages
  const prompts = useMemo(
    () => promptPages?.pages.flatMap((p) => p as TaggedContentItem[]) ?? [],
    [promptPages],
  )
  const threads = useMemo(
    () => threadPages?.pages.flatMap((p) => p as TaggedContentItem[]) ?? [],
    [threadPages],
  )

  // 3. Merge & Sort
  const items = useMemo(() => {
    const dedupeByKey = (list: TaggedContentItem[]) => {
      const seen = new Set<string>()
      return list.filter((item) => {
        const key = `${item.type}-${item.id}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
    }

    // Single-tab views arrive pre-sorted from the DB — no re-sort needed.
    if (activeTab === 'lenses') return dedupeByKey(prompts)
    if (activeTab === 'threads') return dedupeByKey(threads)

    // 'all' tab: merge two separately-sorted lists and re-sort the combined result.
    const result = dedupeByKey([...prompts, ...threads])
    if (sortType === 'newest') {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    } else {
      const getScore = (item: TaggedContentItem) =>
        (item.stats.uses || 0) + (item.stats.likes || 0) + (item.stats.replies || 0)
      result.sort((a, b) => getScore(b) - getScore(a))
    }
    return result
  }, [prompts, threads, activeTab, sortType])

  const loading =
    loadingTag || (shouldFetchPrompts && loadingPrompts) || (shouldFetchThreads && loadingThreads)

  const hasNextPage =
    (activeTab === 'lenses' && hasMorePrompts) ||
    (activeTab === 'threads' && hasMoreThreads) ||
    (activeTab === 'all' && (!!hasMorePrompts || !!hasMoreThreads))

  const fetchNextPage = () => {
    if (activeTab === 'lenses') {
      fetchNextPrompts()
    } else if (activeTab === 'threads') {
      fetchNextThreads()
    } else {
      if (hasMorePrompts) fetchNextPrompts()
      if (hasMoreThreads) fetchNextThreads()
    }
  }

  // Navigation Handlers
  const handleTabChange = (newTab: string) => {
    if (newTab === activeTab) return

    // Preserve sort param
    const sortQuery = sortType !== 'trending' ? `?type=${sortType}` : ''

    if (newTab === 'all') {
      navigate(`/ray/${slug}${sortQuery}`)
    } else {
      navigate(`/ray/${slug}/${newTab}${sortQuery}`)
    }
  }

  const handleSortChange = (newSort: SortOption) => {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev)
      if (newSort === 'trending') p.delete('type')
      else p.set('type', newSort)
      return p
    })
  }

  return {
    tag,
    items,
    loading,
    hasNextPage,
    fetchNextPage,
    filter: activeTab,
    setFilter: handleTabChange,
    sort: sortType,
    setSort: handleSortChange,
    availableFilters: FILTERS,
  }
}
