import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'

import { useLenser } from '@lenserfight/features/profile'
import { tagService } from '@lenserfight/data/repositories'
import { TaggedContentItem, SortOption } from '@lenserfight/types'
import { PromptTagProvider } from '../providers/PromptTagProvider'
import { ThreadTagProvider } from '../providers/ThreadTagProvider'

const promptProvider = new PromptTagProvider()
const threadProvider = new ThreadTagProvider()

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'threads', label: 'Threads' },
  { value: 'prompts', label: 'Prompts' },
]

export const useTagDetailController = (slug?: string) => {
  const { lenser } = useLenser()
  const navigate = useNavigate()

  // URL State
  const { tab: routeTab } = useParams<{ tab?: string; slug: string }>()
  const [searchParams, setSearchParams] = useSearchParams()

  const activeTab = routeTab && ['threads', 'prompts'].includes(routeTab) ? routeTab : 'all'
  const sortType = (searchParams.get('type') as SortOption) || 'trending'

  // 1. Fetch Tag Metadata
  const { data: tag, isLoading: loadingTag } = useQuery({
    queryKey: ['tag', slug],
    queryFn: () => (slug ? tagService.getTagDetails(slug) : null),
    enabled: !!slug,
    staleTime: 1000 * 60 * 10, // 10 minutes
  })

  // 2. Fetch Content (Split queries for independent caching)
  const shouldFetchPrompts = activeTab === 'all' || activeTab === 'prompts'
  const shouldFetchThreads = activeTab === 'all' || activeTab === 'threads'

  const { data: prompts, isLoading: loadingPrompts } = useQuery({
    queryKey: ['tag-prompts', slug, sortType],
    queryFn: () => (slug ? promptProvider.listByTag(slug, sortType, lenser?.id) : []),
    enabled: !!slug && shouldFetchPrompts,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  })

  const { data: threads, isLoading: loadingThreads } = useQuery({
    queryKey: ['tag-threads', slug, sortType],
    queryFn: () => (slug ? threadProvider.listByTag(slug, sortType, lenser?.id) : []),
    enabled: !!slug && shouldFetchThreads,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  })

  // 3. Merge & Sort
  const items = useMemo(() => {
    let result: TaggedContentItem[] = []

    if (activeTab === 'prompts') {
      result = prompts || []
    } else if (activeTab === 'threads') {
      result = threads || []
    } else {
      // All
      result = [...(prompts || []), ...(threads || [])]

      // We need to re-sort the combined list because fetching separately sorted lists
      // and concatenating them doesn't result in a globally sorted list.
      if (sortType === 'newest') {
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      } else {
        // Trending/Popular heuristic
        const getScore = (item: TaggedContentItem) => {
          const uses = item.stats.uses || 0
          const likes = item.stats.likes || 0
          const replies = item.stats.replies || 0
          return uses + likes + replies
        }
        result.sort((a, b) => getScore(b) - getScore(a))
      }
    }
    return result
  }, [prompts, threads, activeTab, sortType])

  const loading =
    loadingTag || (shouldFetchPrompts && loadingPrompts) || (shouldFetchThreads && loadingThreads)

  // Navigation Handlers
  const handleTabChange = (newTab: string) => {
    if (newTab === activeTab) return

    // Preserve sort param
    const sortQuery = sortType !== 'trending' ? `?type=${sortType}` : ''

    if (newTab === 'all') {
      navigate(`/len/${slug}${sortQuery}`)
    } else {
      navigate(`/len/${slug}/${newTab}${sortQuery}`)
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
    filter: activeTab,
    setFilter: handleTabChange,
    sort: sortType,
    setSort: handleSortChange,
    availableFilters: FILTERS,
  }
}
