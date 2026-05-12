import { AlertCircle, Loader2, RefreshCw } from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'

export interface VideoPlayerProps {
  src: string
  mimeType?: string | null
  name?: string | null
  durationSeconds?: number | null
  poster?: string | null
  className?: string
}

export function VideoPlayer({
  src,
  mimeType,
  name,
  durationSeconds,
  poster,
  className = '',
}: VideoPlayerProps) {
  const label = name ?? 'Video output'
  const containerRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible]     = useState(false)
  const [loading, setLoading]     = useState(true)
  const [hasError, setHasError]   = useState(false)
  const [retryKey, setRetryKey]   = useState(0)

  // Lazy-init: only start loading when element enters viewport
  useEffect(() => {
    if (!containerRef.current) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          obs.disconnect()
        }
      },
      { rootMargin: '200px' }
    )
    obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [])

  return (
    <div
      ref={containerRef}
      className={`relative w-full rounded-lg overflow-hidden bg-black ${className}`}
    >
      {visible && !hasError && (
        <video
          key={retryKey}
          controls
          preload="metadata"
          poster={poster ?? undefined}
          className="w-full max-h-96"
          aria-label={label}
          onCanPlay={() => setLoading(false)}
          onError={() => { setLoading(false); setHasError(true) }}
        >
          {mimeType ? <source src={src} type={mimeType} /> : <source src={src} />}
          Your browser does not support the video element.
        </video>
      )}

      {/* Loading spinner overlay */}
      {visible && loading && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
          <Loader2 className="h-6 w-6 text-white animate-spin" />
        </div>
      )}

      {/* Placeholder while not yet in viewport */}
      {!visible && (
        <div className="aspect-video flex items-center justify-center bg-greyscale-900">
          <span className="text-xs text-greyscale-500">{label}</span>
        </div>
      )}

      {/* Error state */}
      {hasError && (
        <div className="aspect-video flex flex-col items-center justify-center gap-3 bg-greyscale-900">
          <AlertCircle className="h-6 w-6 text-red-400" />
          <p className="text-sm text-greyscale-400">Video unavailable</p>
          <button
            onClick={() => { setHasError(false); setLoading(true); setRetryKey((k) => k + 1) }}
            className="flex items-center gap-1.5 text-xs text-greyscale-300 hover:text-white transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </button>
        </div>
      )}

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
