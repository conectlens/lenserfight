import { Badge } from '@lenserfight/ui/components'
import { Drawer } from '@lenserfight/ui/overlays'
import { Loader2, FileText, ImageIcon, Video, Music, File, ExternalLink } from 'lucide-react'
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useMediaGallery, type MediaTypeFilter } from '../hooks/useMediaGallery'
import type { MediaObject, UnifiedMediaType } from '@lenserfight/types'

// ─── Media type icon ─────────────────────────────────────────────────────────

const MEDIA_TYPE_ICON: Record<UnifiedMediaType, React.ReactNode> = {
  text: <FileText size={16} />,
  image: <ImageIcon size={16} />,
  video: <Video size={16} />,
  audio: <Music size={16} />,
  document: <File size={16} />,
  json: <FileText size={16} />,
  binary: <File size={16} />,
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

// ─── Filter chips ────────────────────────────────────────────────────────────

function TypeFilter({
  current,
  onChange,
}: {
  current: MediaTypeFilter
  onChange: (v: MediaTypeFilter) => void
}) {
  const options: { value: MediaTypeFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'image', label: 'Images' },
    { value: 'video', label: 'Video' },
    { value: 'audio', label: 'Audio' },
    { value: 'text', label: 'Text' },
    { value: 'document', label: 'Docs' },
  ]

  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
            current === opt.value
              ? 'bg-primary-yellow-500/15 text-primary-yellow-600'
              : 'bg-surface-base text-greyscale-500 hover:bg-surface-raised hover:text-greyscale-700 dark:hover:text-greyscale-300'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// ─── Media card ──────────────────────────────────────────────────────────────

function MediaCard({ item, onPreview }: { item: MediaObject; onPreview: (id: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onPreview(item.id)}
      className="group flex flex-col gap-2 rounded-xl border border-surface-border bg-surface-base p-3 text-left transition-colors hover:border-primary-yellow-500/40"
    >
      <div className="flex h-16 items-center justify-center rounded-lg bg-greyscale-100 dark:bg-greyscale-800 text-greyscale-400 group-hover:text-greyscale-600 dark:group-hover:text-greyscale-300 transition-colors">
        {MEDIA_TYPE_ICON[item.mediaType] ?? <File size={16} />}
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-greyscale-700 dark:text-greyscale-300">
          {item.name}
        </p>
        <div className="mt-1 flex items-center gap-1.5">
          <Badge color={TYPE_COLORS[item.mediaType] ?? 'gray'} variant="outline">
            {item.mediaType}
          </Badge>
          <span className="text-[10px] text-greyscale-400">
            {new Date(item.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>
    </button>
  )
}

// ─── Preview panel ───────────────────────────────────────────────────────────

function MediaPreview({ item, onBack }: { item: MediaObject; onBack: () => void }) {
  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={onBack}
        className="text-xs font-medium text-primary-yellow-600 hover:text-primary-yellow-700"
      >
        ← Back to gallery
      </button>

      <div className="rounded-xl border border-surface-border bg-surface-base p-4 space-y-3">
        <div className="flex items-center gap-2">
          {MEDIA_TYPE_ICON[item.mediaType]}
          <p className="text-sm font-semibold text-greyscale-900 dark:text-greyscale-50 truncate">
            {item.name}
          </p>
        </div>

        <div className="space-y-1.5 text-xs text-greyscale-500 dark:text-greyscale-400">
          <p><span className="font-medium text-greyscale-700 dark:text-greyscale-300">Type:</span> {item.mediaType}</p>
          {item.mimeType && <p><span className="font-medium text-greyscale-700 dark:text-greyscale-300">MIME:</span> {item.mimeType}</p>}
          {item.byteSize && <p><span className="font-medium text-greyscale-700 dark:text-greyscale-300">Size:</span> {(item.byteSize / 1024).toFixed(1)} KB</p>}
          <p><span className="font-medium text-greyscale-700 dark:text-greyscale-300">Created:</span> {new Date(item.createdAt).toLocaleString()}</p>
          <p><span className="font-medium text-greyscale-700 dark:text-greyscale-300">Visibility:</span> {item.visibility}</p>
        </div>

        {item.contentText && (
          <div className="max-h-40 overflow-y-auto rounded-lg bg-greyscale-50 dark:bg-greyscale-900 p-3 text-xs leading-relaxed text-greyscale-700 dark:text-greyscale-300 whitespace-pre-wrap">
            {item.contentText.length > 2000 ? item.contentText.slice(0, 2000) + '…' : item.contentText}
          </div>
        )}

        {item.externalUrl && (
          <a
            href={item.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-yellow-600 hover:text-primary-yellow-700"
          >
            <ExternalLink size={12} />
            Open external URL
          </a>
        )}
      </div>
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

interface MediaGalleryDrawerProps {
  open: boolean
  onClose: () => void
}

export function MediaGalleryDrawer({ open, onClose }: MediaGalleryDrawerProps) {
  const navigate = useNavigate()
  const gallery = useMediaGallery()
  const [previewId, setPreviewId] = useState<string | null>(null)

  const previewItem = previewId ? gallery.allMedia.find((m) => m.id === previewId) ?? null : null

  return (
    <Drawer
      open={open}
      onClose={onClose}
      side="right"
      width="w-80 sm:w-[28rem] lg:w-[32rem]"
      title="Media Gallery"
    >
      <div className="space-y-4">
        {previewItem ? (
          <MediaPreview item={previewItem} onBack={() => setPreviewId(null)} />
        ) : (
          <>
            <TypeFilter current={gallery.typeFilter} onChange={gallery.setTypeFilter} />

            {gallery.isLoading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-greyscale-500">
                <Loader2 size={14} className="animate-spin" />
                Loading media…
              </div>
            ) : gallery.media.length === 0 ? (
              <p className="py-12 text-center text-sm text-greyscale-400">
                No media objects found.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {gallery.media.map((item) => (
                    <MediaCard key={item.id} item={item} onPreview={setPreviewId} />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    navigate('/media')
                    onClose()
                  }}
                  className="w-full text-center text-xs font-medium text-primary-yellow-600 hover:text-primary-yellow-700 py-2"
                >
                  Open full gallery →
                </button>
              </>
            )}
          </>
        )}
      </div>
    </Drawer>
  )
}
