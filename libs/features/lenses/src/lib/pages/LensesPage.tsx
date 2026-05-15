import { useAuth } from '@lenserfight/features/auth'
import { useLensesFeed } from '@lenserfight/features/home'
import { Button, HelpButton, PageHeader, SEOHead } from '@lenserfight/ui/components'
import { buildAuthReturnUrl } from '@lenserfight/utils/dom'
import { AUTH_BASE_URL } from '@lenserfight/utils/env'
import type { LensViewModel } from '@lenserfight/types'
import { ArrowRight, Plus, Search, AlignLeft, ImageIcon, Video, Mic, Music, Swords, GitBranch } from 'lucide-react'
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { CreateLensModal } from '../components/CreateLensModal'
import { LensesGrid } from '../components/LensesGrid'
import { LensesSortDropdown, type LensesSortOrder } from '../components/LensesSortDropdown'
import { LensesTagFilter } from '../components/LensesTagFilter'
import { useAuthenticatedLenser } from '../hooks/useAuthenticatedLenser'
import { useCreateLens } from '../hooks/useCreateLens'

type OutputKindFilter = 'all' | 'text' | 'image' | 'video' | 'audio' | 'music'

const OUTPUT_KIND_TABS: { value: OutputKindFilter; label: string; Icon: React.ElementType }[] = [
  { value: 'all', label: 'All', Icon: AlignLeft },
  { value: 'text', label: 'Text', Icon: AlignLeft },
  { value: 'image', label: 'Image', Icon: ImageIcon },
  { value: 'video', label: 'Video', Icon: Video },
  { value: 'audio', label: 'Audio', Icon: Mic },
  { value: 'music', label: 'Music', Icon: Music },
]

export const LensesPage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { hasLenser } = useAuthenticatedLenser()
  const { isAuthenticated } = useAuth()

  // URL-synced filters
  const selectedTag = searchParams.get('tag')
  const sortOrder = (searchParams.get('sort') as LensesSortOrder) || 'popular'
  const searchQuery = searchParams.get('q') ?? ''
  const outputKindFilter = (searchParams.get('kind') as OutputKindFilter) || 'all'

  // Local state for search input — debounced into URL
  const [searchInput, setSearchInput] = useState(searchQuery)

  useEffect(() => {
    const t = setTimeout(() => {
      setSearchParams(
        (prev) => {
          if (searchInput) prev.set('q', searchInput)
          else prev.delete('q')
          return prev
        },
        { replace: true }
      )
    }, 400)
    return () => clearTimeout(t)
  }, [searchInput]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleTagSelect = (tag: string | null) => {
    setSearchParams(
      (prev) => {
        if (tag) prev.set('tag', tag)
        else prev.delete('tag')
        return prev
      },
      { replace: true }
    )
  }

  const handleSortChange = (order: LensesSortOrder) => {
    setSearchParams(
      (prev) => {
        if (order !== 'popular') prev.set('sort', order)
        else prev.delete('sort')
        return prev
      },
      { replace: true }
    )
  }

  const handleKindChange = (kind: OutputKindFilter) => {
    setSearchParams(
      (prev) => {
        if (kind !== 'all') prev.set('kind', kind)
        else prev.delete('kind')
        return prev
      },
      { replace: true }
    )
  }

  // React Query Hook
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useLensesFeed(
    searchQuery,
    selectedTag,
    sortOrder
  )

  const lenses = useMemo(() => {
    const seen = new Set<string>()

    const raw = (data?.pages.flatMap((page) => (page.data ?? []) as LensViewModel[]) ?? []) as LensViewModel[]

    return raw
      .filter((lens) => {
        if (seen.has(lens.id)) return false
        seen.add(lens.id)
        return true
      })
      .filter((lens) => {
        if (outputKindFilter === 'all') return true
        const kind = lens.outputKind ?? 'text'
        return kind === outputKindFilter
      })
  }, [data, outputKindFilter])

  // Create Lens Logic
  const {
    isOpen: isCreateOpen,
    openModal,
    closeModal,
    form,
    isSubmitting,
    error: createError,
    submit,
  } = useCreateLens()

  // Intersection Observer callback
  const observer = useRef<IntersectionObserver | null>(null)
  const lastElementRef = useCallback(
    (node: HTMLDivElement) => {
      if (isLoading || isFetchingNextPage) return
      if (observer.current) observer.current.disconnect()

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasNextPage) {
          fetchNextPage()
        }
      })

      if (node) observer.current.observe(node)
    },
    [isLoading, isFetchingNextPage, hasNextPage, fetchNextPage]
  )

  const handleCreateClick = () => {
    if (!isAuthenticated) {
      window.location.href = `${AUTH_BASE_URL}/login?return_url=${encodeURIComponent(buildAuthReturnUrl(window.location.href))}`
      return
    }
    if (!hasLenser) {
      navigate('/onboarding', { state: { from: '/lenses' } })
    } else {
      openModal()
    }
  }

  const handleCreateSuccess = (id: string) => {
    navigate(`/lenses/${id}`)
  }

  return (
    <div className="">
      <SEOHead type="lenses-list" />

      {/* Page Header */}
      <PageHeader
        title="Lenses & Prompts & Skills"
        description="Browse reusable Lens prompts that power battles, workflows, lab runs, and generative media outputs."
        className="sm:mb-4 mt-2"
        action={
          <>
            <HelpButton path="/tutorials/walkthroughs/create-a-lens" />
            <Button
              onClick={handleCreateClick}
              className="w-auto px-4 gap-2 flex items-center whitespace-nowrap"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">Create Lens</span>
              <span className="sm:hidden">Create</span>
            </Button>
          </>
        }
      />

      {/* Controls Bar */}
      <div className="sticky top-[56px] z-20 bg-gray-50/95 dark:bg-gray-900/95 backdrop-blur pb-4 border-b border-gray-100/50 dark:border-gray-800/50 transition-all mb-6 -mx-2 sm:-mx-4 lg:-mx-8 px-2 sm:px-4 lg:px-8">
        {/* Search */}
        <div className="w-full mb-3">
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl leading-5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary sm:text-sm transition-all shadow-sm"
              placeholder="Search for lenses..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
        </div>

        {/* Output-kind filter tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 mb-2 no-scrollbar">
          {OUTPUT_KIND_TABS.map(({ value, label, Icon }) => {
            const isActive = outputKindFilter === value
            return (
              <button
                key={value}
                onClick={() => handleKindChange(value)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border ${isActive
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-primary/50 hover:text-primary dark:hover:text-primary-400'
                  }`}
              >
                <Icon size={12} />
                {label}
              </button>
            )
          })}
        </div>

        {/* Tag filter + sort */}
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between min-w-0 pt-1">
          <div className="w-full sm:w-auto max-w-full min-w-0">
            <LensesTagFilter selectedTag={selectedTag} onSelect={handleTagSelect} />
          </div>

          <div className="flex items-center gap-2 sm:gap-4 shrink-0 justify-between sm:justify-end">
            <div className="min-w-[120px]">
              <LensesSortDropdown value={sortOrder} onChange={handleSortChange} isAuthenticated={isAuthenticated} />
            </div>
          </div>
        </div>
      </div>

      {/* Grid Content */}
      <LensesGrid
        lenses={lenses}
        isLoading={isLoading}
        onOpen={(id) => navigate(`/lenses/${id}`)}
      />

      {/* Intersection Anchor & Loader */}
      <div ref={lastElementRef} className="h-4"></div>
      {isFetchingNextPage && (
        <div className="py-4 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}
      {!hasNextPage && lenses.length > 0 && (
        <p className="text-center text-gray-400 dark:text-gray-500 text-sm py-8">
          No more lenses to load
        </p>
      )}

      {/* Create Modal */}
      <CreateLensModal
        isOpen={isCreateOpen}
        onClose={closeModal}
        onSubmit={() => submit(handleCreateSuccess)}
        form={form}
        isSubmitting={isSubmitting}
        error={createError}
      />

    </div>
  )
}
