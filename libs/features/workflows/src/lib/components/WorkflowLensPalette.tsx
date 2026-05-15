import { lensesService } from '@lenserfight/data/repositories'
import { useAuth } from '@lenserfight/features/auth'
import { LENS_KIND_ORDER, LENS_KIND_REGISTRY, resolveLensKindFromTagSlugs } from '@lenserfight/features/lens-kinds'
import { Button } from '@lenserfight/ui/components'
import { SearchBar } from '@lenserfight/ui/forms'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, GripVertical } from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'

import type { LensKind, LensViewModel, PersonalLensFeedItem } from '@lenserfight/types'

export interface DraggedLensData {
  lens_id: string
  title: string
  visibility?: 'public' | 'private' | 'unlisted'
  lenser_id?: string
}

interface WorkflowLensPaletteProps {
  onDragStart: (data: DraggedLensData) => void
  collapsed?: boolean
  onToggleCollapse?: () => void
}

type PaletteTab = 'mine' | 'popular'

const PAGE_SIZE = 20

export function WorkflowLensPalette({ onDragStart, collapsed, onToggleCollapse }: WorkflowLensPaletteProps) {
  const { user } = useAuth()
  const [tab, setTab] = useState<PaletteTab>('mine')
  const [rawSearch, setRawSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [allowAutoFetchNextPage, setAllowAutoFetchNextPage] = useState(false)
  const [kindFilter, setKindFilter] = useState<LensKind | null>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // Debounce: only propagate search query after 300ms of inactivity
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(rawSearch), 300)
    return () => clearTimeout(t)
  }, [rawSearch])

  useEffect(() => {
    setAllowAutoFetchNextPage(false)
  }, [tab, debouncedSearch])

  // My lenses — infinite scroll
  const personalQuery = useInfiniteQuery({
    queryKey: ['workflow-palette-personal', user?.id],
    queryFn: ({ pageParam }: { pageParam: number }) =>
      lensesService.getPersonalFeed(user?.id ?? '', pageParam, PAGE_SIZE),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) =>
      lastPage.meta?.hasNextPage ? pages.length * PAGE_SIZE : undefined,
    enabled: !!user?.id,
    staleTime: 1000 * 60,
  })

  const myLenses: LensViewModel[] =
    (personalQuery.data?.pages.flatMap((p) => p.data) ?? []) as PersonalLensFeedItem[]

  // Auto-switch to popular when user has no personal lenses
  const effectiveTab: PaletteTab = myLenses.length === 0 && !personalQuery.isLoading ? 'popular' : tab

  // Popular lenses — infinite scroll
  const popularQuery = useInfiniteQuery({
    queryKey: ['workflow-palette-popular'],
    queryFn: ({ pageParam }: { pageParam: number }) =>
      lensesService.sort('popular', pageParam, PAGE_SIZE),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) =>
      lastPage.meta?.hasNextPage ? pages.length * PAGE_SIZE : undefined,
    enabled: effectiveTab === 'popular' || (personalQuery.isSuccess && myLenses.length === 0),
    staleTime: 1000 * 60 * 5,
  })

  const popularLenses: LensViewModel[] =
    popularQuery.data?.pages.flatMap((p) => p.data ?? []) ?? []

  // Search — min 3 chars, fires after debounce (keep as regular query, no infinite scroll)
  const { data: searchData, isLoading: loadingSearch } = useQuery({
    queryKey: ['workflow-palette-search', debouncedSearch, user?.id],
    queryFn: () => lensesService.search(debouncedSearch, 0, 20, user?.id ?? null),
    enabled: debouncedSearch.length >= 3,
    staleTime: 5000,
  })
  const searchResults: LensViewModel[] = searchData?.data ?? []

  const isSearching = debouncedSearch.length >= 3
  const rawLenses: LensViewModel[] =
    isSearching ? searchResults : effectiveTab === 'mine' ? myLenses : popularLenses
  const displayLenses: LensViewModel[] = kindFilter
    ? rawLenses.filter((l) => resolveLensKindFromTagSlugs(l.tags?.map((t) => t.slug) ?? []) === kindFilter)
    : rawLenses

  const activeQuery = isSearching ? null : effectiveTab === 'mine' ? personalQuery : popularQuery
  const isLoading = isSearching ? loadingSearch : activeQuery?.isLoading ?? false

  // IntersectionObserver — trigger next page when sentinel enters viewport
  useEffect(() => {
    if (!sentinelRef.current || !activeQuery) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (
          allowAutoFetchNextPage &&
          entry.isIntersecting &&
          activeQuery.hasNextPage &&
          !activeQuery.isFetchingNextPage &&
          !activeQuery.isLoading
        ) {
          activeQuery.fetchNextPage()
        }
      },
      { threshold: 0.1 }
    )
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [allowAutoFetchNextPage, effectiveTab, isSearching, activeQuery?.hasNextPage, activeQuery?.isFetchingNextPage, activeQuery?.isLoading])

  const handleDragStart = (e: React.DragEvent, lens: LensViewModel) => {
    const data: DraggedLensData = {
      lens_id: lens.id,
      title: lens.title,
      visibility: lens.visibility as 'public' | 'private' | 'unlisted',
      lenser_id: lens.author?.id,
    }
    e.dataTransfer.setData('application/lenserfight-lens', JSON.stringify(data))
    e.dataTransfer.effectAllowed = 'copy'
    onDragStart(data)
  }

  if (collapsed) {
    return (
      <aside className="flex flex-col w-10 flex-shrink-0 border-r border-surface-border bg-surface-base overflow-hidden items-center py-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          className="!h-8 !w-8 !p-0 text-greyscale-400 hover:!text-greyscale-700 dark:hover:!text-greyscale-200"
          title="Expand lens palette"
        >
          <ChevronRight size={14} />
        </Button>
      </aside>
    )
  }

  return (
    <aside className="flex flex-col w-60 flex-shrink-0 border-r border-surface-border bg-surface-base overflow-hidden">
      <div className="flex items-center justify-between px-3 pt-3 pb-0">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-greyscale-400">Lenses</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          className="!h-6 !w-6 !p-0 text-greyscale-400 hover:!text-greyscale-700 dark:hover:!text-greyscale-200"
          title="Collapse palette"
        >
          <ChevronLeft size={12} />
        </Button>
      </div>
      <div className="px-3 pt-2 pb-2 space-y-2">
        {/* Search */}
        <SearchBar
          value={rawSearch}
          onChange={(e) => setRawSearch(e.target.value)}
          onClear={() => { setRawSearch(''); setDebouncedSearch('') }}
          loading={loadingSearch && rawSearch.length >= 3}
          placeholder="Search lenses… (3+ chars)"
          className="text-xs"
        />

        {/* Tabs */}
        {!isSearching && myLenses.length > 0 && (
          <div className="flex gap-1">
            {(['mine', 'popular'] as const).map((t) => (
              <Button
                key={t}
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setTab(t)}
                className={`flex-1 !rounded-lg !px-2 !py-1 !text-xs !font-semibold ${
                  effectiveTab === t
                    ? '!bg-primary-yellow-500/15 !text-primary-yellow-600 hover:!bg-primary-yellow-500/15'
                    : '!text-greyscale-500 hover:!text-greyscale-900 dark:hover:!text-greyscale-50 !bg-transparent'
                }`}
              >
                {t === 'mine' ? 'My Lenses' : 'Popular'}
              </Button>
            ))}
          </div>
        )}

        {/* Kind filter */}
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => setKindFilter(null)}
            className={`text-[10px] rounded-full px-2 py-0.5 font-semibold transition-colors ${
              kindFilter === null
                ? 'bg-primary-yellow-500/15 text-primary-yellow-600'
                : 'bg-surface-raised text-greyscale-500 hover:text-greyscale-900 dark:hover:text-greyscale-50'
            }`}
          >
            All
          </button>
          {LENS_KIND_ORDER.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKindFilter(kindFilter === k ? null : k)}
              title={LENS_KIND_REGISTRY[k].description}
              className={`text-[10px] rounded-full px-2 py-0.5 font-semibold transition-colors ${
                kindFilter === k
                  ? 'bg-primary-yellow-500/15 text-primary-yellow-600'
                  : 'bg-surface-raised text-greyscale-500 hover:text-greyscale-900 dark:hover:text-greyscale-50'
              }`}
            >
              {LENS_KIND_REGISTRY[k].label}
            </button>
          ))}
        </div>
      </div>

      {/* Lens list */}
      <div
        className="flex-1 overflow-y-auto px-2 pb-3 space-y-1"
        onScroll={() => setAllowAutoFetchNextPage(true)}
      >
        {isLoading &&
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 rounded-xl bg-surface-raised animate-pulse" />
          ))}

        {!isLoading && displayLenses.length === 0 && (
          <p className="py-8 text-center text-xs text-greyscale-400">
            {isSearching ? 'No lenses found.' : 'No lenses available.'}
          </p>
        )}

        {!isLoading &&
          displayLenses.map((lens) => (
            <div
              key={lens.id}
              draggable
              onDragStart={(e) => handleDragStart(e, lens)}
              title={`Drag to add "${lens.title}"`}
              className="flex items-center gap-2 rounded-xl border border-surface-border bg-surface-raised px-2.5 py-2 cursor-grab active:cursor-grabbing select-none hover:border-primary-yellow-500/40 hover:bg-primary-yellow-500/5 transition-colors group"
            >
              <GripVertical
                size={12}
                className="flex-shrink-0 text-greyscale-300 group-hover:text-greyscale-400 transition-colors"
              />
              <div className="flex-1 min-w-0">
                <p className="truncate text-xs font-medium text-greyscale-800 dark:text-greyscale-100 leading-tight">
                  {lens.title}
                </p>
                {lens.visibility !== 'public' && (
                  <p className="text-[10px] text-greyscale-400 capitalize mt-0.5">{lens.visibility}</p>
                )}
              </div>
            </div>
          ))}

        {/* Sentinel for infinite scroll */}
        {!isSearching && (
          <div ref={sentinelRef} className="h-4" />
        )}

        {/* Loading more indicator */}
        {activeQuery?.isFetchingNextPage && (
          <div className="flex justify-center py-2">
            <div className="h-4 w-4 rounded-full border-2 border-primary-yellow-500 border-t-transparent animate-spin" />
          </div>
        )}
      </div>
    </aside>
  )
}
