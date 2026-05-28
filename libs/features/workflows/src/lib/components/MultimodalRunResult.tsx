import React from 'react'
import { MediaOutputCard } from './MediaOutputCard'

export interface ManifestEntry {
  object_id: string
  media_type: 'image' | 'video' | 'audio' | string
  mime_type: string
  node_id?: string | null
  /** Signed or external preview URL — may be absent if the object is still processing. */
  url?: string | null
}

export interface MultimodalRunResultProps {
  manifest: ManifestEntry[]
  className?: string
}

export function MultimodalRunResult({ manifest, className = '' }: MultimodalRunResultProps) {
  if (manifest.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">No media produced for this run.</p>
    )
  }

  return (
    <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 ${className}`}>
      {manifest.map((entry) => (
        <MediaOutputCard
          key={entry.object_id}
          objectId={entry.object_id}
          mediaType={entry.media_type as 'image' | 'video' | 'audio'}
          mimeType={entry.mime_type}
          previewUrl={entry.url ?? null}
        />
      ))}
    </div>
  )
}
