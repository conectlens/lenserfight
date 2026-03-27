import { useAuth } from '@lenserfight/features/auth'
import { useLensesFeed } from '@lenserfight/features/home'
import { Button, PageHeader } from '@lenserfight/ui/components'
import { SEOHead } from '@lenserfight/ui/components'
import { buildAuthReturnUrl } from '@lenserfight/utils/dom'
import { Plus } from 'lucide-react'
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { CreateLensModal } from '../components/CreateLensModal'
import { LensesGrid } from '../components/LensesGrid'
import { LensesSearchBar } from '../components/LensesSearchBar'
import { LensesSortDropdown } from '../components/LensesSortDropdown'
import { LensesTagFilter } from '../components/LensesTagFilter'
import { useAuthenticatedLenser } from '../hooks/useAuthenticatedLenser'
import { useCreateLens } from '../hooks/useCreateLens'

export const LensesPage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { hasLenser } = useAuthenticatedLenser()
  const { isAuthenticated } = useAuth()

  // URL-synced filters
  const selectedTag = searchParams.get('tag')
  const sortOrder = (searchParams.get('sort') as 'newest' | 'popular') || 'popular'
  const searchQuery = searchParams.get('q') ?? ''

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

  const handleSortChange = (order: 'newest' | 'popular') => {
    setSearchParams(
      (prev) => {
        if (order !== 'popular') prev.set('sort', order)
        else prev.delete('sort')
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

    return (
      data?.pages
        .flatMap((page) => page.data ?? [])
        .filter((lens) => {
          if (seen.has(lens.id)) return false
          seen.add(lens.id)
          return true
        }) ?? []
    )
  }, [data])

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
      const authAppUrl = import.meta.env.VITE_AUTH_BASE_URL ?? 'https://auth.lenserfight.com'
      window.location.href = `${authAppUrl}/login?return_url=${encodeURIComponent(buildAuthReturnUrl(window.location.href))}`
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
        title="Discover Lenses"
        description="Find, share, and remix the best AI lenses from the community."
        className="mb-6 sm:mb-8 mt-2"
      />

      {/* Controls Bar */}
      <div className="sticky top-[56px] z-20 bg-gray-50/95 dark:bg-gray-900/95 backdrop-blur py-3 border-b border-gray-100/50 dark:border-gray-800/50 transition-all mb-6 -mx-2 sm:-mx-4 lg:-mx-8 px-2 sm:px-4 lg:px-8">
        <div className="w-full">
          <LensesSearchBar value={searchInput} onChange={setSearchInput} />
        </div>

        <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between min-w-0">
          <div className="w-full sm:w-auto max-w-full min-w-0">
            <LensesTagFilter selectedTag={selectedTag} onSelect={handleTagSelect} />
          </div>

          <div className="flex items-center gap-2 sm:gap-4 shrink-0 justify-between sm:justify-end">
            <div className="min-w-[120px]">
              <LensesSortDropdown value={sortOrder} onChange={handleSortChange} />
            </div>
            <Button
              onClick={handleCreateClick}
              className="w-auto px-4 gap-2 flex items-center whitespace-nowrap"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">Create Lens</span>
              <span className="sm:hidden">Create</span>
            </Button>
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
