import { Badge, Card } from '@lenserfight/ui/components'
import { Loader2, FileText, ImageIcon, Video, Music, File, Search } from 'lucide-react'
import React from 'react'

import { useMediaGallery, type MediaTypeFilter } from '../hooks/useMediaGallery'
import { useMediaActions } from '../hooks/useMediaActions'
import type { MediaObject, UnifiedMediaType } from '@lenserfight/types'

// ─── Media type icons ────────────────────────────────────────────────────────

const MEDIA_TYPE_ICON: Record<UnifiedMediaType, React.ReactNode> = {
  text: <FileText size={20} />,
  image: <ImageIcon size={20} />,
  video: <Video size={20} />,
  audio: <Music size={20} />,
  document: <File size={20} />,
  json: <FileText size={20} />,
  binary: <File size={20} />,
}

const TYPE_COLORS: Record<UnifiedMediaType, 'blue' | 'green' | 'purple' | 'yellow' | 'gray'> = {
  text: 'blue',
  image: 'green',
  video: 'purple',
  audio: 'yellow',
  document: 'gray',
  json: 'blue',
  binary: 'gray',
}

// ─── Filter bar ──────────────────────────────────────────────────────────────

function FilterBar({
  typeFilter,
  onTypeChange,
  searchQuery,
  onSearchChange,
}: {
  typeFilter: MediaTypeFilter
  onTypeChange: (v: MediaTypeFilter) => void
  searchQuery: string
  onSearchChange: (v: string) => void
}) {
  const types: { value: MediaTypeFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'image', label: 'Images' },
    { value: 'video', label: 'Video' },
    { value: 'audio', label: 'Audio' },
    { value: 'text', label: 'Text' },
    { value: 'document', label: 'Documents' },
    { value: 'json', label: 'JSON' },
  ]

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-1.5">
        {types.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => onTypeChange(t.value)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              typeFilter === t.value
                ? 'bg-primary-yellow-500/15 text-primary-yellow-600'
                : 'bg-surface-base text-greyscale-500 hover:bg-surface-raised hover:text-greyscale-700 dark:hover:text-greyscale-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-greyscale-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search media…"
          className="w-full rounded-xl border border-surface-border bg-surface-base py-2 pl-9 pr-3 text-sm text-greyscale-900 dark:text-greyscale-50 placeholder-greyscale-400 outline-none focus:border-primary-yellow-500 focus:ring-1 focus:ring-primary-yellow-500/30 sm:w-64"
        />
      </div>
    </div>
  )
}

// ─── Media card ──────────────────────────────────────────────────────────────

function MediaGridCard({ item }: { item: MediaObject }) {
  return (
    <Card className="group flex flex-col gap-3 p-4 transition-colors hover:border-primary-yellow-500/40">
      <div className="flex h-24 items-center justify-center rounded-xl bg-greyscale-100 dark:bg-greyscale-800 text-greyscale-400 group-hover:text-greyscale-600 dark:group-hover:text-greyscale-300 transition-colors">
        {MEDIA_TYPE_ICON[item.mediaType] ?? <File size={20} />}
      </div>
      <div className="min-w-0 space-y-1.5">
        <p className="truncate text-sm font-medium text-greyscale-900 dark:text-greyscale-50">
          {item.name}
        </p>
        <div className="flex items-center gap-2">
          <Badge color={TYPE_COLORS[item.mediaType] ?? 'gray'} variant="outline">
            {item.mediaType}
          </Badge>
          {item.byteSize && (
            <span className="text-[11px] text-greyscale-400">
              {(item.byteSize / 1024).toFixed(1)} KB
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-greyscale-400">
          <span>{new Date(item.createdAt).toLocaleDateString()}</span>
          <span className="capitalize">{item.visibility}</span>
        </div>
      </div>
    </Card>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────

export const MediaGalleryPage: React.FC = () => {
  const gallery = useMediaGallery()
  // AT: media actions wired with empty lenserId — gallery hook provides the owner context
  const mediaActions = useMediaActions('')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-greyscale-900 dark:text-greyscale-50">
          Media Gallery
        </h1>
        <p className="mt-1 text-sm text-greyscale-500 dark:text-greyscale-400">
          Browse all your uploaded and generated media objects.
        </p>
      </div>

      <FilterBar
        typeFilter={gallery.typeFilter}
        onTypeChange={gallery.setTypeFilter}
        searchQuery={gallery.searchQuery}
        onSearchChange={gallery.setSearchQuery}
      />

      {gallery.isLoading ? (
        <div className="flex items-center justify-center gap-2 py-24 text-sm text-greyscale-500">
          <Loader2 size={16} className="animate-spin" />
          Loading media…
        </div>
      ) : gallery.media.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24">
          <p className="text-sm text-greyscale-400">
            {gallery.searchQuery || gallery.typeFilter !== 'all'
              ? 'No media matches your filters.'
              : 'No media objects yet. Run a lens to generate outputs.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {gallery.media.map((item) => (
            <MediaGridCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}
