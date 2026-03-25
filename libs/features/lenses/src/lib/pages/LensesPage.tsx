import { Plus } from 'lucide-react'
import React, { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { Button } from '@lenserfight/ui/components'
import { SEOHead } from '@lenserfight/ui/components'
import { useAuth } from '@lenserfight/features/auth'
import { useLensesFeed } from '@lenserfight/features/home'
import { CreateLenserProfileModal } from '@lenserfight/features/onboarding'
import { buildAuthReturnUrl } from '@lenserfight/utils/dom'
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
  const [showProfileModal, setShowProfileModal] = useState(false)

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

  const lenses = data?.pages.flatMap((page) => page.data ?? []) || []

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
      setShowProfileModal(true)
    } else {
      openModal()
    }
  }

  const handleCreateSuccess = (id: string) => {
    navigate(`/lenses/${id}`)
  }

  return (
    <div className="max-w-7xl mx-auto pb-12 px-2 sm:px-4 lg:px-8">
      <SEOHead type="lenses-list" />

      {/* Page Header */}
      <div className="mb-6 sm:mb-8 mt-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Discover Lenses
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-base sm:text-lg">
          Find, share, and remix the best AI lenses from the community.
        </p>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col gap-4 mb-8">
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

      {showProfileModal && <CreateLenserProfileModal onClose={() => setShowProfileModal(false)} />}
    </div>
  )
}
