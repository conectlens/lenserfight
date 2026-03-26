import { lensesService } from '@lenserfight/data/repositories'
import { useAuth } from '@lenserfight/features/auth'
import { useQuery } from '@tanstack/react-query'
import { GripVertical, Search } from 'lucide-react'
import React, { useState } from 'react'
import type { LensViewModel, PersonalLensFeedItem } from '@lenserfight/types'

export interface DraggedLensData {
  lens_id: string
  title: string
}

interface WorkflowLensPaletteProps {
  onDragStart: (data: DraggedLensData) => void
}

type PaletteTab = 'mine' | 'popular'

export function WorkflowLensPalette({ onDragStart }: WorkflowLensPaletteProps) {
  const { user } = useAuth()
  const [tab, setTab] = useState<PaletteTab>('mine')
  const [search, setSearch] = useState('')

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

  // Search results — respects RLS (only public or owned lenses returned by service)
  const { data: searchData, isLoading: loadingSearch } = useQuery({
    queryKey: ['workflow-palette-search', search],
    queryFn: () => lensesService.search(search, 0, 20),
    enabled: search.length >= 2,
    staleTime: 5000,
  })
  const searchResults: LensViewModel[] = searchData?.data ?? []

  const displayLenses: LensViewModel[] =
    search.length >= 2 ? searchResults : effectiveTab === 'mine' ? myLenses : popularLenses
  const isLoading =
    search.length >= 2 ? loadingSearch : effectiveTab === 'mine' ? loadingPersonal : loadingPopular

  const handleDragStart = (e: React.DragEvent, lens: LensViewModel) => {
    const data: DraggedLensData = { lens_id: lens.id, title: lens.title }
    e.dataTransfer.setData('application/lenserfight-lens', JSON.stringify(data))
    e.dataTransfer.effectAllowed = 'copy'
    onDragStart(data)
  }

  return (
    <aside className="flex flex-col w-60 flex-shrink-0 border-r border-surface-border bg-surface-base overflow-hidden">
      <div className="px-3 pt-3 pb-2 space-y-2">
        {/* Search */}
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-greyscale-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search lenses…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-surface-border bg-surface-raised pl-7 pr-2.5 py-1.5 text-xs text-greyscale-900 placeholder:text-greyscale-400 outline-none focus:border-status-blue dark:text-greyscale-50"
          />
        </div>

        {/* Tabs */}
        {search.length < 2 && myLenses.length > 0 && (
          <div className="flex gap-1">
            {(['mine', 'popular'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`flex-1 rounded-lg px-2 py-1 text-xs font-semibold transition-colors ${
                  effectiveTab === t
                    ? 'bg-status-blue/15 text-status-blue'
                    : 'text-greyscale-500 hover:text-greyscale-900 dark:hover:text-greyscale-50'
                }`}
              >
                {t === 'mine' ? 'My Lenses' : 'Popular'}
              </button>
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
            {search.length >= 2 ? 'No lenses found.' : 'No lenses available.'}
          </p>
        )}

        {!isLoading &&
          displayLenses.map((lens) => (
            <div
              key={lens.id}
              draggable
              onDragStart={(e) => handleDragStart(e, lens)}
              title={`Drag to add "${lens.title}"`}
              className="flex items-center gap-2 rounded-xl border border-surface-border bg-surface-raised px-2.5 py-2 cursor-grab active:cursor-grabbing select-none hover:border-status-blue/40 hover:bg-status-blue/5 transition-colors group"
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
