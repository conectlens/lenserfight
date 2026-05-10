import React from 'react'

export interface AudioPlayerProps {
  src: string
  mimeType?: string | null
  name?: string | null
  durationSeconds?: number | null
  className?: string
}

export function AudioPlayer({ src, mimeType, name, durationSeconds, className = '' }: AudioPlayerProps) {
  const label = name ?? 'Audio output'

  return (
    <div className={`flex flex-col gap-2 p-4 rounded-lg bg-greyscale-100 dark:bg-greyscale-900 ${className}`}>
      <div className="flex items-center justify-between gap-2 min-w-0">
        <p className="text-xs text-greyscale-500 truncate">{label}</p>
        {durationSeconds != null && (
          <span className="text-xs font-mono text-greyscale-400 shrink-0">
            {formatDuration(durationSeconds)}
          </span>
        )}
      </div>
      <audio controls className="w-full" preload="metadata" aria-label={label}>
        {mimeType ? <source src={src} type={mimeType} /> : <source src={src} />}
        Your browser does not support the audio element.
      </audio>
    </div>
  )
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}
