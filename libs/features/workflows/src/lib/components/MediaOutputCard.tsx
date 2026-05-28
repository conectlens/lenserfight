import React from 'react'
import { MediaViewer, type MediaViewerProps } from '@lenserfight/ui/data-display'

// Phase AK — workflow-run media result card.
//
// Wraps the shared MediaViewer with metadata + a download affordance that
// goes through `/v1/media/:objectId` (the media-proxy route). The proxy
// returns a 302 to a 1-hour signed URL; the browser handles the redirect,
// so we just point an anchor at it.
//
// Future phases:
//   - AT adds visibility toggle + delete buttons here.
//   - AP renders multimodal manifests via a higher-level grid component
//     that composes several MediaOutputCards.

export interface MediaOutputCardProps {
  /** media.objects.id — used for the proxy URL. */
  objectId: string
  /** Logical media kind. Maps to MediaViewer.mediaType. */
  mediaType: 'image' | 'video' | 'audio' | 'document' | 'text' | 'unknown'
  mimeType?: string | null
  /** Inline preview URL. Prefer the signed URL from the proxy when available. */
  previewUrl?: string | null
  /** Optional content text (for text outputs). */
  contentText?: string | null
  /** Display name shown in the header strip. */
  name?: string | null
  /** Bytes label, formatted by the caller. */
  byteSize?: number | null
  /** Duration in seconds for video/audio media (AN). */
  durationSeconds?: number | null
  /** When true, hides the download button (e.g. share-card preview). */
  hideDownload?: boolean
  className?: string
  /** AT: called when user confirms deletion of this media object. */
  onDelete?: () => void
  /** AT: called when user toggles visibility. */
  onToggleVisibility?: (visibility: 'public' | 'private' | 'unlisted') => void
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

export function MediaOutputCard({
  objectId,
  mediaType,
  mimeType,
  previewUrl,
  contentText,
  name,
  byteSize,
  durationSeconds,
  hideDownload = false,
  onDelete,
  onToggleVisibility,
  className,
}: MediaOutputCardProps) {
  const proxyHref = `/v1/media/${objectId}`
  const viewerProps: MediaViewerProps = {
    mediaType,
    url: previewUrl ?? proxyHref,
    mimeType,
    name,
    contentText,
  }

  return (
    <div
      className={[
        'rounded-xl border border-greyscale-200 dark:border-greyscale-800 bg-white dark:bg-greyscale-950 overflow-hidden',
        className ?? '',
      ].join(' ')}
    >
      <MediaViewer {...viewerProps} />

      <div className="flex items-center justify-between gap-3 px-3 py-2 border-t border-greyscale-200 dark:border-greyscale-800 text-xs text-greyscale-600 dark:text-greyscale-400">
        <div className="flex items-center gap-2 min-w-0">
          {mimeType ? (
            <span
              className="inline-flex items-center px-1.5 py-0.5 rounded bg-greyscale-100 dark:bg-greyscale-900 font-mono"
              title="MIME type"
            >
              {mimeType}
            </span>
          ) : null}
          {byteSize != null ? <span>{formatBytes(byteSize)}</span> : null}
          {durationSeconds != null ? <span>{formatDuration(durationSeconds)}</span> : null}
          {name ? <span className="truncate">{name}</span> : null}
        </div>
        <div className="flex items-center gap-1">
          {onToggleVisibility ? (
            <button
              type="button"
              onClick={() => onToggleVisibility('public')}
              className="px-2 py-1 rounded text-xs hover:bg-greyscale-100 dark:hover:bg-greyscale-800 transition-colors"
              title="Toggle visibility"
            >
              Share
            </button>
          ) : null}
          {onDelete ? (
            <button
              type="button"
              onClick={onDelete}
              className="px-2 py-1 rounded text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              title="Delete media"
            >
              Delete
            </button>
          ) : null}
          {!hideDownload ? (
            <a
              href={proxyHref}
              className="inline-flex items-center px-2 py-1 rounded bg-greyscale-900 text-white hover:bg-greyscale-700 transition-colors text-xs font-medium"
              download={name ?? `media-${objectId.slice(0, 8)}`}
            >
              Download
            </a>
          ) : null}
        </div>
      </div>
    </div>
  )
}
