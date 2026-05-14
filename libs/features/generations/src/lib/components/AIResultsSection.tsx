import { Sparkles, Plus } from 'lucide-react'
import React, { useEffect, useState, useRef, useCallback } from 'react'

import { Button } from '@lenserfight/ui/components'
import { ConfirmModal } from '@lenserfight/ui/modals'
import { SelectField } from '@lenserfight/ui/forms'
import { generationService } from '@lenserfight/data/repositories'
import { AIGeneration, MediaKind, AIModel } from '@lenserfight/types'
import { useAuthenticatedLenser } from '../hooks/useAuthenticatedLenser'

import { CreateGenerationModal } from './CreateGenerationModal'
import { GenerationMasonryGrid } from './GenerationMasonryGrid'
import { GenerationPreviewModal } from './GenerationPreviewModal'

interface AIResultsSectionProps {
  lensId: string
}

const PAGE_SIZE = 20

export const AIResultsSection: React.FC<AIResultsSectionProps> = ({ lensId }) => {
  const { lenser, hasLenser } = useAuthenticatedLenser()
  const [generations, setGenerations] = useState<AIGeneration[]>([])
  const [loading, setLoading] = useState(false)

  // Filtering & Pagination
  const [mediaFilter, setMediaFilter] = useState<MediaKind | 'all'>('all')
  const [modelFilter, setModelFilter] = useState<string>('all')
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const observer = useRef<IntersectionObserver | null>(null)

  // Available Models for Filter
  const [availableModels, setAvailableModels] = useState<AIModel[]>([])
  const [modelsLoaded, setModelsLoaded] = useState(false)
  const [isLoadingModels, setIsLoadingModels] = useState(false)

  // Modal & Delete State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [previewItem, setPreviewItem] = useState<AIGeneration | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Lazy Load Models
  const handleLoadModels = async () => {
    if (modelsLoaded || isLoadingModels) return

    setIsLoadingModels(true)
    try {
      const models = await generationService.getAIModels()
      setAvailableModels(models)
      setModelsLoaded(true)
    } catch (e) {
      console.warn('Failed to load models for filter', e)
    } finally {
      setIsLoadingModels(false)
    }
  }

  // Fetch Logic
  const fetchGenerations = async (pageNum: number, reset = false) => {
    if (!lensId || !lenser) return

    setLoading(true)
    try {
      const offset = pageNum * PAGE_SIZE
      const newItems = await generationService.getGenerations(lensId, lenser.id, {
        limit: PAGE_SIZE,
        offset,
        mediaKind: mediaFilter,
        aiModelSlug: modelFilter,
      })

      if (newItems.length < PAGE_SIZE) {
        setHasMore(false)
      } else {
        setHasMore(true)
      }

      setGenerations((prev) => (reset ? newItems : [...prev, ...newItems]))
    } catch (e) {
      console.error('Failed to load generations', e)
    } finally {
      setLoading(false)
    }
  }

  // Initial Load & Filter Change
  useEffect(() => {
    setPage(0)
    setHasMore(true)
    fetchGenerations(0, true)
  }, [lensId, lenser?.id, mediaFilter, modelFilter])

  // Infinite Scroll Observer
  const lastElementRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (loading) return
      if (observer.current) observer.current.disconnect()

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setPage((prev) => {
            const next = prev + 1
            fetchGenerations(next, false)
            return next
          })
        }
      })

      if (node) observer.current.observe(node)
    },
    [loading, hasMore]
  )

  // Actions
  const handleCreateSuccess = () => {
    setMediaFilter('all')
    setModelFilter('all')
    setPage(0)
    fetchGenerations(0, true)
  }

  const confirmDelete = async () => {
    if (!deleteTarget || !lenser) return
    setIsDeleting(true)
    try {
      await generationService.deleteGeneration(deleteTarget, lenser.id)
      setGenerations((prev) => prev.filter((g) => g.id !== deleteTarget))
      setDeleteTarget(null)
    } catch (e) {
      console.error('Failed to delete', e)
    } finally {
      setIsDeleting(false)
    }
  }
  const existingUrls = generations.map((g) => g.media?.url).filter((url): url is string => !!url)

  if (!hasLenser) return null

  return (
    <div className="mt-4 pt-4 md:mt-12 md:pt-8 border-t border-gray-100 dark:border-gray-800">
      {/* Header & Generate Actions */}
      <div className="flex flex-row justify-between items-center gap-4 mb-6">
        <div>
          <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Sparkles size={20} className="text-primary-600" />
            AI Generations
          </h3>
          <p className="hidden md:block text-sm text-gray-500 dark:text-gray-400 mt-1">
            Explore results generated with this prompt.
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="w-auto px-3 md:px-4 py-2 h-auto flex items-center gap-2"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Add Result</span>
          </Button>
        </div>
      </div>

      {/* Filters - Static (Non-Sticky) */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        {/* Media Type Badges with Custom Scrollbar */}
        <div className="flex gap-2 overflow-x-auto generations-scroll pb-2">
          {['all', 'image', 'video', 'text'].map((type) => (
            <button
              key={type}
              onClick={() => setMediaFilter(type as MediaKind | 'all')}
              className={`
                            px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide transition-all whitespace-nowrap
                            ${mediaFilter === type
                  ? 'bg-primary text-gray-900 shadow-sm'
                  : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                }
                        `}
            >
              {type}
            </button>
          ))}
        </div>

        {/* AI Model Select - Pass scoped class for dropdown */}
        <div className="w-full md:w-64 ml-auto relative">
          <SelectField
            value={modelFilter}
            onChange={setModelFilter}
            onOpen={handleLoadModels}
            options={[
              { value: 'all', label: 'All Models' },
              ...availableModels.map((m) => ({ value: m.key, label: m.name })),
            ]}
            className="w-full"
            dropdownClassName="generations-scroll"
          />
        </div>
      </div>

      {/* Masonry Grid */}
      <GenerationMasonryGrid
        generations={generations}
        isLoading={loading && page === 0}
        hasMore={hasMore}
        loadRef={lastElementRef}
        onDelete={setDeleteTarget}
        onPreview={setPreviewItem}
      />

      {/* Modals */}
      <CreateGenerationModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
        lensId={lensId}
        existingUrls={existingUrls}
      />

      <GenerationPreviewModal
        isOpen={!!previewItem}
        onClose={() => setPreviewItem(null)}
        generation={previewItem}
        models={availableModels}
      />

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete Result"
        message="Are you sure you want to delete this AI result? This cannot be undone."
        confirmLabel="Delete"
        isLoading={isDeleting}
      />
    </div>
  )
}
