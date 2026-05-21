import {
  FileText,
  ImageIcon,
  Video,
  Music,
  File,
  Upload,
  Library,
  X,
  Loader2,
} from 'lucide-react'
import React, { useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { mediaService } from '@lenserfight/data/repositories'
import type { MediaObject, UnifiedMediaType } from '@lenserfight/types'

import { useAuthenticatedLenser } from '../hooks/useAuthenticatedLenser'

// ─── Domain type ─────────────────────────────────────────────────────────────

/** Discriminated union representing media staged for a thread post. */
export type PendingThreadMedia =
  | { kind: 'file'; file: File }
  | { kind: 'object'; mediaObject: MediaObject }

// ─── Icons ───────────────────────────────────────────────────────────────────

const MEDIA_ICON: Record<UnifiedMediaType, React.ReactNode> = {
  text: <FileText size={14} />,
  image: <ImageIcon size={14} />,
  video: <Video size={14} />,
  audio: <Music size={14} />,
  document: <File size={14} />,
  json: <FileText size={14} />,
  binary: <File size={14} />,
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ThreadMediaPickerProps {
  pending: PendingThreadMedia | null
  onFileSelect: (file: File) => void
  onGallerySelect: (mediaObject: MediaObject) => void
  onClear: () => void
}

// ─── Selected item chip ───────────────────────────────────────────────────────

function SelectedChip({
  label,
  icon,
  onClear,
}: {
  label: string
  icon: React.ReactNode
  onClear: () => void
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-surface-border bg-surface-raised px-2.5 py-1.5 text-xs text-greyscale-700 dark:text-greyscale-300">
      {icon}
      <span className="max-w-[180px] truncate font-medium">{label}</span>
      <button
        type="button"
        onClick={onClear}
        className="ml-1 text-greyscale-400 hover:text-greyscale-600 dark:hover:text-greyscale-200 transition-colors"
        aria-label="Remove attachment"
      >
        <X size={12} />
      </button>
    </div>
  )
}

// ─── Gallery panel ────────────────────────────────────────────────────────────

function GalleryPanel({
  onSelect,
}: {
  onSelect: (obj: MediaObject) => void
}) {
  const { lenser } = useAuthenticatedLenser()
  const { data: mediaObjects = [], isLoading } = useQuery<MediaObject[]>({
    queryKey: ['media', 'gallery', lenser?.id],
    queryFn: () => mediaService.getByOwner(lenser!.id),
    enabled: !!lenser?.id,
    staleTime: 30_000,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-6 text-xs text-greyscale-400">
        <Loader2 size={12} className="animate-spin" />
        Loading…
      </div>
    )
  }

  if (mediaObjects.length === 0) {
    return (
      <p className="py-6 text-center text-xs text-greyscale-400">
        No media objects yet. Upload one below.
      </p>
    )
  }

  return (
    <ul className="max-h-44 overflow-y-auto space-y-1 pr-1">
      {mediaObjects.map((obj) => (
        <li key={obj.id}>
          <button
            type="button"
            onClick={() => onSelect(obj)}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs hover:bg-surface-raised transition-colors"
          >
            <span className="text-greyscale-500">{MEDIA_ICON[obj.mediaType] ?? <File size={14} />}</span>
            <span className="flex-1 truncate font-medium text-greyscale-700 dark:text-greyscale-300">
              {obj.name}
            </span>
            <span className="text-[10px] text-greyscale-400">{obj.mediaType}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

type TabId = 'upload' | 'gallery'

export function ThreadMediaPicker({
  pending,
  onFileSelect,
  onGallerySelect,
  onClear,
}: ThreadMediaPickerProps) {
  const [expanded, setExpanded] = useState(false)
  const [activeTab, setActiveTab] = useState<TabId>('upload')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    onFileSelect(file)
    setExpanded(false)
    // Reset so the same file can be re-selected after clearing
    e.target.value = ''
  }

  // When a gallery item is selected, collapse the picker
  const handleGallerySelect = (obj: MediaObject) => {
    onGallerySelect(obj)
    setExpanded(false)
  }

  // ── Selected state ────────────────────────────────────────────────────────
  if (pending) {
    const label =
      pending.kind === 'file' ? pending.file.name : pending.mediaObject.name
    const icon =
      pending.kind === 'file'
        ? <File size={14} />
        : (MEDIA_ICON[pending.mediaObject.mediaType] ?? <File size={14} />)

    return (
      <div className="flex items-center gap-2">
        <SelectedChip label={label} icon={icon} onClear={onClear} />
      </div>
    )
  }

  // ── Collapsed state ───────────────────────────────────────────────────────
  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-greyscale-500 hover:text-greyscale-700 dark:hover:text-greyscale-300 hover:bg-surface-raised transition-colors border border-dashed border-surface-border"
      >
        <Upload size={12} />
        Attach media
      </button>
    )
  }

  // ── Expanded picker ───────────────────────────────────────────────────────
  return (
    <div className="rounded-xl border border-surface-border bg-surface-base p-3 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {([
            { id: 'upload' as TabId, label: 'Upload', icon: <Upload size={12} /> },
            { id: 'gallery' as TabId, label: 'My Media', icon: <Library size={12} /> },
          ] as { id: TabId; label: string; icon: React.ReactNode }[]).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary-yellow-500/15 text-primary-yellow-600'
                  : 'text-greyscale-500 hover:text-greyscale-700 dark:hover:text-greyscale-300'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="text-greyscale-400 hover:text-greyscale-600 dark:hover:text-greyscale-200 transition-colors"
          aria-label="Close media picker"
        >
          <X size={14} />
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'upload' ? (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            className="sr-only"
            accept="image/*,video/*,audio/*,application/pdf,.txt,.json"
            onChange={handleFileChange}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed border-surface-border py-6 text-xs text-greyscale-400 hover:border-primary-yellow-500/40 hover:text-greyscale-600 dark:hover:text-greyscale-300 transition-colors"
          >
            <Upload size={20} className="text-greyscale-300" />
            <span>Click to choose a file</span>
            <span className="text-[10px]">Images, video, audio, PDF, text, JSON</span>
          </button>
        </div>
      ) : (
        <GalleryPanel onSelect={handleGallerySelect} />
      )}
    </div>
  )
}
