import React, { useRef, useState } from 'react'

export interface AudioPlayerProps {
  src: string
  mimeType?: string | null
  name?: string | null
  durationSeconds?: number | null
  className?: string
}

const BAR_COUNT = 30

function getBarHeights(): number[] {
  return Array.from({ length: BAR_COUNT }, (_, i) =>
    Math.round(20 + Math.sin(i * 0.6 + 1) * 10 + Math.cos(i * 0.3) * 6)
  )
}

const BAR_HEIGHTS = getBarHeights()

export function AudioPlayer({
  src,
  mimeType,
  name,
  durationSeconds,
  className = '',
}: AudioPlayerProps) {
  const label       = name ?? 'Audio output'
  const audioRef    = useRef<HTMLAudioElement>(null)
  const [progress, setProgress]   = useState(0)
  const [loading, setLoading]     = useState(true)
  const [hasError, setHasError]   = useState(false)

  const handleTimeUpdate = () => {
    const el = audioRef.current
    if (!el || !el.duration) return
    setProgress(el.currentTime / el.duration)
  }

  if (hasError) {
    return (
      <div className={`flex flex-col gap-2 p-4 rounded-lg bg-greyscale-100 dark:bg-greyscale-900 ${className}`}>
        <p className="text-xs text-greyscale-500">Audio unavailable</p>
      </div>
    )
  }

  return (
    <div className={`flex flex-col gap-3 p-4 rounded-lg bg-greyscale-100 dark:bg-greyscale-900 ${className}`}>
      <div className="flex items-center justify-between gap-2 min-w-0">
        <p className="text-xs text-greyscale-500 truncate">{label}</p>
        {durationSeconds != null && (
          <span className="text-xs font-mono text-greyscale-400 shrink-0">
            {formatDuration(durationSeconds)}
          </span>
        )}
      </div>

      {/* Waveform bars */}
      <div className="flex items-center gap-0.5 h-10" aria-hidden>
        {BAR_HEIGHTS.map((h, i) => {
          const filled = i / BAR_COUNT < progress
          return (
            <div
              key={i}
              className={[
                'flex-1 rounded-full transition-colors',
                loading
                  ? 'bg-greyscale-200 dark:bg-greyscale-800 animate-pulse'
                  : filled
                    ? 'bg-accent-primary'
                    : 'bg-greyscale-300 dark:bg-greyscale-700',
              ].join(' ')}
              style={{ height: `${h}px` }}
            />
          )
        })}
      </div>

      <audio
        ref={audioRef}
        controls
        className="w-full"
        preload="metadata"
        aria-label={label}
        onCanPlay={() => setLoading(false)}
        onTimeUpdate={handleTimeUpdate}
        onError={() => { setLoading(false); setHasError(true) }}
      >
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
