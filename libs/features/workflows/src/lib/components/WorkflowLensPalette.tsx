import { lensesService } from '@lenserfight/data/repositories'
import { useAuth } from '@lenserfight/features/auth'
import { Button } from '@lenserfight/ui/components'
import { SearchBar } from '@lenserfight/ui/forms'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, GripVertical } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import type { LensViewModel, PersonalLensFeedItem } from '@lenserfight/types'

export interface DraggedLensData {
  lens_id: string
  title: string
}

interface WorkflowLensPaletteProps {
  onDragStart: (data: DraggedLensData) => void
  collapsed?: boolean
  onToggleCollapse?: () => void
}

type PaletteTab = 'mine' | 'popular'

export function WorkflowLensPalette({ onDragStart, collapsed, onToggleCollapse }: WorkflowLensPaletteProps) {
  const { user } = useAuth()
  const [tab, setTab] = useState<PaletteTab>('mine')
  const [rawSearch, setRawSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Debounce: only propagate search query after 300ms of inactivity
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(rawSearch), 300)
    return () => clearTimeout(t)
  }, [rawSearch])

  // My lenses via personal feed
  const { data: personalData, isLoading: loadingPersonal } = useQuery({
    queryKey: ['workflow-palette-personal', user?.id],
    queryFn: () => lensesService.getPersonalFeed(user?.id ?? '', 0, 30),
    enabled: !!user?.id,
    staleTime: 1000 * 60,
  })
  const myLenses: LensViewModel[] = (personalData?.data ?? []) as PersonalLensFeedItem[]

  // Auto-switch to popular when user has no personal lenses
  const effectiveTab: PaletteTab = myLenses.length === 0 && !loadingPersonal ? 'popular' : tab

  // Popular lenses (fetched when tab is popular OR as fallback)
  const { data: popularData, isLoading: loadingPopular } = useQuery({
    queryKey: ['workflow-palette-popular'],
    queryFn: () => lensesService.sort('popular', 0, 30),
    enabled: effectiveTab === 'popular' || myLenses.length === 0,
    staleTime: 1000 * 60 * 5,
  })
  const popularLenses: LensViewModel[] = popularData?.data ?? []

  // Search — min 3 chars, fires after debounce
  const { data: searchData, isLoading: loadingSearch } = useQuery({
    queryKey: ['workflow-palette-search', debouncedSearch],
    queryFn: () => lensesService.search(debouncedSearch, 0, 20),
    enabled: debouncedSearch.length >= 3,
    staleTime: 5000,
  })
  const searchResults: LensViewModel[] = searchData?.data ?? []

  const isSearching = debouncedSearch.length >= 3
  const displayLenses: LensViewModel[] =
    isSearching ? searchResults : effectiveTab === 'mine' ? myLenses : popularLenses
  const isLoading =
    isSearching ? loadingSearch : effectiveTab === 'mine' ? loadingPersonal : loadingPopular

  const handleDragStart = (e: React.DragEvent, lens: LensViewModel) => {
    const data: DraggedLensData = { lens_id: lens.id, title: lens.title }
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
      </div>

      {/* Lens list */}
      <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-1">
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
      </div>
    </aside>
  )
}
