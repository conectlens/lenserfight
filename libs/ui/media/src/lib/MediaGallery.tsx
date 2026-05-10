import React from 'react'
import { VideoPlayer } from './VideoPlayer'
import { AudioPlayer } from './AudioPlayer'

export interface MediaGalleryItem {
  id: string
  mediaType: 'image' | 'video' | 'audio' | string
  mimeType?: string | null
  url: string
  name?: string | null
  durationSeconds?: number | null
}

export interface MediaGalleryProps {
  items: MediaGalleryItem[]
  onDelete?: (id: string) => void
  onToggleVisibility?: (id: string, visibility: 'public' | 'private' | 'unlisted') => void
  className?: string
}

function MediaPreview({ item }: { item: MediaGalleryItem }) {
  if (item.mediaType === 'video') {
    return (
      <VideoPlayer
        src={item.url}
        mimeType={item.mimeType}
        name={item.name}
        durationSeconds={item.durationSeconds}
      />
    )
  }
  if (item.mediaType === 'audio') {
    return (
      <AudioPlayer
        src={item.url}
        mimeType={item.mimeType}
        name={item.name}
        durationSeconds={item.durationSeconds}
      />
    )
  }
  // image or unknown
  return (
    <img
      src={item.url}
      alt={item.name ?? 'media'}
      className="w-full h-40 object-cover rounded-lg bg-greyscale-100 dark:bg-greyscale-900"
      loading="lazy"
    />
  )
}

export function MediaGallery({
  items,
  onDelete,
  onToggleVisibility,
  className = '',
}: MediaGalleryProps) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-greyscale-500 dark:text-greyscale-400">No media items.</p>
    )
  }

  return (
    <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 ${className}`}>
      {items.map((item) => (
        <div
          key={item.id}
          className="rounded-xl border border-greyscale-200 dark:border-greyscale-800 bg-white dark:bg-greyscale-950 overflow-hidden"
        >
          <MediaPreview item={item} />

          {(onDelete || onToggleVisibility) && (
            <div className="flex items-center justify-end gap-1 px-3 py-2 border-t border-greyscale-200 dark:border-greyscale-800">
              {onToggleVisibility && (
                <button
                  type="button"
                  onClick={() => onToggleVisibility(item.id, 'public')}
                  className="px-2 py-1 text-xs rounded hover:bg-greyscale-100 dark:hover:bg-greyscale-800 transition-colors"
                >
                  Share
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(item.id)}
                  className="px-2 py-1 text-xs rounded text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                >
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
