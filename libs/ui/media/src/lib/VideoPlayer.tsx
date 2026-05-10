import React from 'react'

export interface VideoPlayerProps {
  src: string
  mimeType?: string | null
  name?: string | null
  durationSeconds?: number | null
  className?: string
}

export function VideoPlayer({ src, mimeType, name, durationSeconds, className = '' }: VideoPlayerProps) {
  const label = name ?? 'Video output'

  return (
    <div className={`relative w-full rounded-lg overflow-hidden bg-black ${className}`}>
      <video
        controls
        preload="metadata"
        className="w-full max-h-96"
        aria-label={label}
      >
        {mimeType ? <source src={src} type={mimeType} /> : <source src={src} />}
        Your browser does not support the video element.
      </video>
      {durationSeconds != null && (
        <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-xs font-mono bg-black/70 text-white pointer-events-none">
          {formatDuration(durationSeconds)}
        </span>
      )}
    </div>
  )
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}
