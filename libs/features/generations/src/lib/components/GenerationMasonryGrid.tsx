import { Trash2 } from 'lucide-react'
import React from 'react'

import { AIGeneration } from '@lenserfight/types'
import { useAuthenticatedLenser } from '../hooks/useAuthenticatedLenser'

import { MediaCard } from './MediaCard'

interface GenerationMasonryGridProps {
  generations: AIGeneration[]
  onDelete?: (id: string) => void
  onPreview: (gen: AIGeneration) => void
  isLoading: boolean
  hasMore: boolean
  loadRef: React.Ref<HTMLDivElement>
}

export const GenerationMasonryGrid: React.FC<GenerationMasonryGridProps> = ({
  generations,
  onDelete,
  onPreview,
  isLoading,
  hasMore,
  loadRef,
}) => {
  const { lenser } = useAuthenticatedLenser()

  if (isLoading && generations.length === 0) {
    return (
      <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className={`break-inside-avoid bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse ${i % 2 === 0 ? 'h-48' : 'h-64'}`}
          ></div>
        ))}
      </div>
    )
  }

  if (generations.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50/50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
          No results match your filters.
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          Try generating something new or changing options.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
        {generations.map((gen) => {
          const isCreator = lenser?.id === gen.lenser_id

          return (
            <div key={gen.id} className="break-inside-avoid relative group">
              <MediaCard
                media={gen.media}
                onClick={() => onPreview(gen)}
                textPreview={gen.input_text}
              />

              {/* Creator Actions */}
              {isCreator && onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(gen.id)
                  }}
                  className="absolute top-2 right-2 p-2 bg-red-500/90 text-white rounded-lg hover:bg-red-600 shadow-sm backdrop-blur-sm transition-opacity opacity-0 group-hover:opacity-100"
                  title="Delete Result"
                >
                  <Trash2 size={14} />
                </button>
              )}

              {/* Footer Info */}
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-b-xl">
                <p className="text-[10px] text-white/90 font-medium truncate">
                  {new Date(gen.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Infinite Scroll Anchor */}
      <div ref={loadRef} className="h-8 flex items-center justify-center mt-4">
        {hasMore && isLoading && (
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-primary"></div>
        )}
      </div>
    </>
  )
}
